import { prisma } from "@/lib/db";
import { guardV1, okWithLimit, fail, pagination } from "@/lib/api-v1";
import { searchProfiles } from "@/lib/search";

/**
 * GET /api/v1/profiles — the public read API.
 *
 * Query: `q`, `type`, `system`, `category`, `sort` (views|name), `limit` (1-50),
 * `offset`. Requires `Authorization: Bearer ts_live_...` with the `read` scope.
 *
 * This is the paid surface: same data the site shows, in a stable shape with a
 * documented envelope, per-key rate limits, and usage accounting.
 */
export async function GET(req: Request) {
  const guard = await guardV1(req);
  if (guard.response) return guard.response;

  const { searchParams, limit, offset } = pagination(req, 20, 50);
  const q = searchParams.get("q")?.trim() ?? "";
  const type = searchParams.get("type")?.trim() ?? "";
  const system = searchParams.get("system")?.trim() ?? "";
  const category = searchParams.get("category")?.trim() ?? "";
  const sort = searchParams.get("sort") ?? "views";

  const where: Record<string, unknown> = {};
  if (category) where.category = { slug: category };
  if (type) {
    where.typings = {
      some: {
        typeValue: type,
        ...(system ? { typingSystem: { slug: system } } : {}),
      },
    };
  }

  const orderBy =
    sort === "name" ? [{ name: "asc" as const }] : [{ viewCount: "desc" as const }];

  // Text search goes through Meili when it can; a null result means fall back.
  let ids: string[] | null = null;
  if (q) {
    const meili = await searchProfiles({
      q,
      types: type ? [type] : undefined,
      categorySlug: category || undefined,
      sort,
      limit,
      offset,
    });
    if (meili) ids = meili.hits.map((h) => h.id);
  }

  if (ids) {
    const rows = await prisma.profile.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        imageUrl: true,
        viewCount: true,
        category: { select: { name: true, slug: true } },
        typings: {
          select: {
            typeValue: true,
            confidence: true,
            typingSystem: { select: { name: true, slug: true } },
          },
        },
      },
    });
    const byId = new Map(rows.map((r) => [r.id, r]));
    const ordered = ids.map((id) => byId.get(id)).filter(Boolean);

    return okWithLimit(guard.auth, ordered, {
      total: ids.length,
      limit,
      offset,
      engine: "meilisearch",
    });
  }

  const [rows, total] = await Promise.all([
    prisma.profile.findMany({
      where: q
        ? {
            ...where,
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
            ],
          }
        : where,
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        imageUrl: true,
        viewCount: true,
        category: { select: { name: true, slug: true } },
        typings: {
          select: {
            typeValue: true,
            confidence: true,
            typingSystem: { select: { name: true, slug: true } },
          },
        },
      },
      orderBy,
      skip: offset,
      take: limit,
    }),
    prisma.profile.count({ where }),
  ]);

  return okWithLimit(guard.auth, rows, {
    total,
    limit,
    offset,
    engine: "postgres",
  });
}
