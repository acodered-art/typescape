/**
 * Pure response helpers for the public API.
 *
 * Kept free of Prisma/auth imports so the contract can be unit-tested and so
 * every `/api/v1` route shares one envelope shape. A second client (mobile, bot,
 * partner) breaks silently when a field is renamed, so this shape is asserted in
 * `tests/api-contract.test.ts`.
 */

/** Consistent success envelope. `meta` is nested, never merged into `data`. */
export function ok<T>(data: T, meta?: Record<string, unknown>): Response {
  return Response.json(meta ? { data, meta } : { data });
}

/** Consistent failure envelope: always a top-level `error` string. */
export function fail(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

/**
 * Clamped pagination. A missing or non-numeric value falls back to the default;
 * a *present* numeric value is clamped. Note the distinction matters: `limit=0`
 * must clamp to 1, not fall back to the default, which `Number(x) || default`
 * would get wrong because 0 is falsy.
 */
export function pagination(req: Request, defaultLimit = 20, maxLimit = 50) {
  const { searchParams } = new URL(req.url);

  const parse = (raw: string | null, fallback: number) => {
    if (raw === null || raw.trim() === "") return fallback;
    const n = Number(raw);
    return Number.isFinite(n) ? Math.floor(n) : fallback;
  };

  const limit = parse(searchParams.get("limit"), defaultLimit);
  const offset = parse(searchParams.get("offset"), 0);

  return {
    searchParams,
    limit: Math.min(Math.max(limit, 1), maxLimit),
    offset: Math.max(offset, 0),
  };
}
