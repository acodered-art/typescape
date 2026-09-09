import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { PREFIX, hashKey, generateApiKey } from "@/lib/api-key";
import { effectivePlanSlug, getPlan } from "@/lib/plans";

export { hashKey, generateApiKey };

/**
 * API-key authentication for the public read API.
 *
 * Keys are shown once at creation and stored as SHA-256 hashes, so the database
 * never holds a usable credential. Lookup is by hash, which is a unique index.
 *
 * Usage in a route:
 *
 *   const auth = await authenticateApiRequest(req);
 *   if ("response" in auth) return auth.response;
 *   // auth.user, auth.scopes
 */

export type ApiAuth = {
  user: { id: string; username: string };
  scopes: string[];
  keyId: string;
  /** The plan actually in force for this key's owner. */
  plan: string;
  /** Request limit for this key, so responses can advertise it. */
  rateLimit: number;
  /** Requests left in the current window. */
  remaining: number;
};

export type ApiAuthResult = ApiAuth | { response: Response };

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function bearerToken(req: Request): string | null {
  const header = req.headers.get("authorization");
  if (!header) return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

/**
 * Verify the bearer key and enforce its rate limit. Missing/!valid keys get a
 * 401 with a WWW-Authenticate hint; over-limit gets 429.
 */
export async function authenticateApiRequest(req: Request): Promise<ApiAuthResult> {
  const token = bearerToken(req);
  if (!token) {
    return { response: jsonError("Missing API key. Send it as: Authorization: Bearer <key>", 401) };
  }
  if (!token.startsWith(PREFIX)) {
    return { response: jsonError("Invalid API key.", 401) };
  }

  const record = await prisma.apiKey.findUnique({
    where: { keyHash: hashKey(token) },
    select: {
      id: true,
      userId: true,
      scopes: true,
      rateLimit: true,
      revokedAt: true,
      user: {
        select: {
          id: true,
          username: true,
          plan: true,
          subscriptions: {
            where: { status: { in: ["active", "past_due"] } },
            orderBy: { currentPeriodEnd: "desc" },
            take: 1,
            select: { planSlug: true, status: true, currentPeriodEnd: true },
          },
        },
      },
    },
  });

  if (!record || record.revokedAt) {
    return { response: jsonError("Invalid or revoked API key.", 401) };
  }

  // The owner's effective plan sets the ceiling. A per-key override may lower
  // it but never raise it above the plan.
  const planSlug = effectivePlanSlug(
    record.user.subscriptions[0] ?? null,
    record.user.plan
  );
  const planLimit = getPlan(planSlug).apiRateLimit;
  const limit = Math.min(record.rateLimit ?? planLimit, planLimit);
  const rl = await rateLimit(`apikey:${record.id}`, limit, 60_000);
  if (!rl.allowed) {
    return {
      response: new Response(
        JSON.stringify({ error: "Rate limit exceeded", limit }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": "60",
            "X-RateLimit-Limit": String(limit),
            "X-RateLimit-Remaining": "0",
          },
        }
      ),
    };
  }

  // Usage accounting is best-effort; never fail the request for it.
  prisma.apiKey
    .update({
      where: { id: record.id },
      data: { lastUsedAt: new Date(), requestCount: { increment: 1 } },
    })
    .catch(() => {});

  return {
    user: { id: record.user.id, username: record.user.username },
    scopes: record.scopes,
    keyId: record.id,
    plan: planSlug,
    rateLimit: limit,
    remaining: rl.remaining,
  };
}

/** True when the authenticated key carries a scope. */
export function hasScope(auth: ApiAuth, scope: string): boolean {
  return auth.scopes.includes(scope) || auth.scopes.includes("*");
}
