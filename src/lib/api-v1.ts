import { authenticateApiRequest, hasScope, type ApiAuth } from "@/lib/api-auth";
import { ok, fail, pagination } from "@/lib/api-response";
import { auth } from "@/lib/session";
import { getPlan } from "@/lib/plans";

/**
 * One-line guard for `/api/v1` routes.
 *
 * Accepts either credential a client can hold:
 *
 *   1. an **API key** (`ts_live_…`) — integrations, machine clients, anything
 *      acting without a signed-in human. Rate-limited per key, scoped, metered,
 *      and billed by plan.
 *   2. a **session bearer token** from `POST /api/auth/token` — a native client
 *      acting *as a reader*. Same authority as the browser cookie, so a mobile
 *      app can vote or comment without being issued an API key.
 *
 * Both resolve to the same shape, so routes do not care which was used. The
 * response helpers live in `api-response.ts` (dependency-free, unit-tested) and
 * are re-exported so a route needs one import.
 *
 *   const guard = await guardV1(req, "write");
 *   if (guard.response) return guard.response;
 *   // guard.auth.user.id
 */

export type V1Auth = ApiAuth & { via: "key" | "session" };

function deny(status: number, error: string): Response {
  return Response.json({ error }, { status });
}

export async function guardV1(
  req: Request,
  scope: "read" | "write" = "read"
): Promise<{ auth: V1Auth; response?: never } | { auth?: never; response: Response }> {
  const header = req.headers.get("authorization");

  // An API key always carries the known prefix; a session token is opaque hex.
  // Route on the prefix so the two paths never cross.
  const looksLikeKey = !!header && /^Bearer\s+ts_live_/i.test(header);

  if (looksLikeKey) {
    const result = await authenticateApiRequest(req);
    if ("response" in result) return { response: result.response };
    if (!hasScope(result, scope)) {
      return { response: deny(403, `This key lacks the '${scope}' scope`) };
    }
    return { auth: { ...result, via: "key" } };
  }

  const session = await auth();
  if (!session?.user) {
    return {
      response: deny(
        401,
        "Provide an API key (Authorization: Bearer ts_live_…) or a session token from POST /api/auth/token."
      ),
    };
  }

  const plan = getPlan(null);

  return {
    auth: {
      user: { id: session.user.id, username: session.user.username ?? "unknown" },
      scopes: ["read", "write"],
      keyId: "session",
      plan: plan.slug,
      rateLimit: plan.apiRateLimit,
      remaining: plan.apiRateLimit,
      via: "session",
    },
  };
}

/**
 * Success envelope with rate-limit state attached for key callers. A session
 * caller is limited per IP by the route's own limiter, so key headers would be
 * misleading and are omitted.
 */
export function okWithLimit(
  auth: V1Auth,
  data: unknown,
  meta?: Record<string, unknown>
): Response {
  const res = ok(data, meta);
  if (auth.via === "key") {
    res.headers.set("X-RateLimit-Limit", String(auth.rateLimit));
    res.headers.set("X-RateLimit-Remaining", String(auth.remaining));
  }
  return res;
}

export { ok, fail, pagination };
