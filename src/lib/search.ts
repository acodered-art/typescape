/**
 * MeiliSearch client and profile index sync.
 *
 * Meili is optional infrastructure: every function here degrades to a no-op or
 * a null result when the instance is unreachable, and the caller falls back to
 * Postgres. Never let a search outage break a page.
 *
 * Index shape (`profiles`):
 *   { id, slug, name, description, bio, categoryName, categorySlug,
 *     types: string[], viewCount }
 *
 * `types` is filterable so `?type=INFP` works, and everything except
 * `viewCount` is searchable.
 */

const MEILI_URL = process.env.MEILI_URL || "http://localhost:7710";
const MEILI_KEY = process.env.MEILI_MASTER_KEY || "";
export const PROFILES_INDEX = "profiles";

export type ProfileDoc = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  bio: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  types: string[];
  viewCount: number;
};

async function meiliFetch(
  path: string,
  init: RequestInit = {},
  timeoutMs = 2500
): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(`${MEILI_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${MEILI_KEY}`,
        "Content-Type": "application/json",
        ...(init.headers || {}),
      },
    });
  } catch {
    return null; // unreachable / timed out
  } finally {
    clearTimeout(timer);
  }
}

/** True when Meili answers a health probe. Cheap enough for request-time checks. */
export async function meiliAvailable(): Promise<boolean> {
  const res = await meiliFetch("/health", { method: "GET" }, 1000);
  return !!res && res.ok;
}

/** Create the index if missing and set searchable/filterable attributes. */
export async function ensureProfilesIndex(): Promise<boolean> {
  const create = await meiliFetch("/indexes", {
    method: "POST",
    body: JSON.stringify({ uid: PROFILES_INDEX, primaryKey: "id" }),
  });
  // 409 = already exists, which is fine.
  if (!create || (!create.ok && create.status !== 409)) return false;

  const settings = await meiliFetch(`/indexes/${PROFILES_INDEX}/settings`, {
    method: "PATCH",
    body: JSON.stringify({
      searchableAttributes: ["name", "description", "bio", "categoryName", "types"],
      // name first, then category, then types; viewCount is only for sorting.
      rankingRules: ["words", "typo", "proximity", "attribute", "sort", "exactness"],
      filterableAttributes: ["types", "categorySlug"],
      sortableAttributes: ["viewCount", "name"],
      displayedAttributes: ["*"],
    }),
  });
  return !!settings && settings.ok;
}

/** Upsert documents. Returns false when Meili is unavailable (caller should fall back). */
export async function indexProfiles(docs: ProfileDoc[]): Promise<boolean> {
  if (docs.length === 0) return true;
  const res = await meiliFetch(`/indexes/${PROFILES_INDEX}/documents`, {
    method: "PUT",
    body: JSON.stringify(docs),
  });
  return !!res && res.ok;
}

export async function deleteProfile(id: string): Promise<boolean> {
  const res = await meiliFetch(`/indexes/${PROFILES_INDEX}/documents/${id}`, {
    method: "DELETE",
  });
  return !!res && res.ok;
}

export type MeiliSearchHit = ProfileDoc;

export type MeiliSearchResult = {
  hits: MeiliSearchHit[];
  total: number;
} | null;

/**
 * Search the index. Returns `null` (not an empty result) when Meili is
 * unavailable or errors, so callers can distinguish "no matches" from
 * "search is down, use Postgres".
 */
export async function searchProfiles(opts: {
  q?: string;
  types?: string[];
  categorySlug?: string;
  sort?: string;
  limit?: number;
  offset?: number;
}): Promise<MeiliSearchResult> {
  const filters: string[] = [];
  if (opts.types?.length) {
    filters.push(`types IN [${opts.types.map((t) => JSON.stringify(t)).join(", ")}]`);
  }
  if (opts.categorySlug) {
    filters.push(`categorySlug = ${JSON.stringify(opts.categorySlug)}`);
  }

  const sortMap: Record<string, string[]> = {
    views: ["viewCount:desc"],
    name: ["name:asc"],
    // "recent"/"votes"/"typings" have no dedicated index field; relevance order.
  };

  const res = await meiliFetch(`/indexes/${PROFILES_INDEX}/search`, {
    method: "POST",
    body: JSON.stringify({
      q: opts.q || "",
      filter: filters.length ? filters.join(" AND ") : undefined,
      sort: sortMap[opts.sort || ""] ?? undefined,
      limit: opts.limit ?? 20,
      offset: opts.offset ?? 0,
    }),
  });
  if (!res || !res.ok) return null;

  try {
    const data = (await res.json()) as {
      hits?: MeiliSearchHit[];
      estimatedTotalHits?: number;
    };
    return { hits: data.hits ?? [], total: data.estimatedTotalHits ?? 0 };
  } catch {
    return null;
  }
}

/**
 * Build index documents straight from Postgres. Used by the reindex script and
 * after writes so the index never drifts far from the DB.
 */
export async function buildDocsFromDb(
  prismaClient: {
    profile: {
      findMany: (args: unknown) => Promise<
        {
          id: string;
          slug: string;
          name: string;
          description: string | null;
          bio: string | null;
          viewCount: number;
          category: { name: string; slug: string } | null;
          typings: { typeValue: string }[];
        }[]
      >;
    };
  },
  where: Record<string, unknown> = {}
): Promise<ProfileDoc[]> {
  const rows = await prismaClient.profile.findMany({
    where,
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      bio: true,
      viewCount: true,
      category: { select: { name: true, slug: true } },
      typings: { select: { typeValue: true } },
    },
  });

  return rows.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    description: p.description,
    bio: p.bio,
    categoryName: p.category?.name ?? null,
    categorySlug: p.category?.slug ?? null,
    types: [...new Set(p.typings.map((t) => t.typeValue))],
    viewCount: p.viewCount,
  }));
}
