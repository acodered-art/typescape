import { authenticateApiRequest, hasScope, type ApiAuth } from "@/lib/api-auth";
import { ok, fail, pagination } from "@/lib/api-response";

/**
 * One-line guard for `/api/v1` routes.
 *
 * Returns either the auth context or a ready-to-return response, so a route
 * cannot accidentally skip the scope check or invent its own error shape. Every
 * v1 endpoint starts with:
 *
 *   const guard = await guardV1(req);
 *   if (guard.response) return guard.response;
 *   // guard.auth is non-null here
 *
 * The response helpers live in `api-response.ts` (dependency-free, unit-tested)
 * and are re-exported here so a route needs only one import.
 */
export async function guardV1(
  req: Request,
  scope: "read" | "write" = "read"
): Promise<{ auth: ApiAuth; response?: never } | { auth?: never; response: Response }> {
  const result = await authenticateApiRequest(req);
  if ("response" in result) return { response: result.response };

  if (!hasScope(result, scope)) {
    return { response: fail(`This key lacks the '${scope}' scope`, 403) };
  }

  return { auth: result };
}

/**
 * Success envelope with the caller's rate-limit state attached, so a client can
 * back off before it gets a 429 instead of after.
 */
export function okWithLimit(
  auth: ApiAuth,
  data: unknown,
  meta?: Record<string, unknown>
): Response {
  const res = ok(data, meta);
  res.headers.set("X-RateLimit-Limit", String(auth.rateLimit));
  res.headers.set("X-RateLimit-Remaining", String(auth.remaining));
  return res;
}

export { ok, fail, pagination };
