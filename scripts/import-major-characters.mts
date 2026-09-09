/**
 * Import *major* characters, ranked by how much the audience actually cares.
 *
 *   npx tsx scripts/import-major-characters.mts                    # dry run
 *   npx tsx scripts/import-major-characters.mts --apply
 *   npx tsx scripts/import-major-characters.mts --apply --anime 12 --series "One Piece"
 *
 * Why a second importer: `import-characters.mts` walks sources alphabetically,
 * which is why we ended up with "The Robber Kitten" and ".GIFfany" instead of
 * anyone a reader has heard of. Alphabetical order has nothing to do with
 * prominence.
 *
 * This one ranks by popularity first, then filters to **main cast only**:
 *
 *   1. take the most-favourited anime from Kitsu;
 *   2. fetch each show's characters, keeping only `role = "main"`;
 *   3. store them as a franchise category named after the show.
 *
 * The result is a handful of characters per franchise that a reader recognises,
 * rather than the first 60 names in alphabetical order.
 *
 * Licence note: Kitsu publishes no data terms (see docs/DATA-SOURCES.md). This
 * importer is therefore opt-in and disabled by default — run it deliberately.
 */
import { prisma } from "../src/lib/db";

const ARGS = process.argv.slice(2);
const APPLY = ARGS.includes("--apply");
const argValue = (name: string): string | null => {
  const i = ARGS.indexOf(name);
  return i >= 0 && ARGS[i + 1] ? ARGS[i + 1] : null;
};

const TOP_SHOWS = Number(argValue("--shows")) || 12;
const ONLY_ANIME = argValue("--anime");
const ONLY_SERIES = argValue("--series");
const INCLUDE_SUPPORTING = ARGS.includes("--supporting");

const UA = "TypeScape/0.1 (+https://typescape.walker-fg.uk; character import)";
const ACCEPT = "application/vnd.api+json";

const pause = (ms = 300) => new Promise((r) => setTimeout(r, ms));

/** Backoff on 429/5xx — Kitsu publishes no rate limit, so be conservative. */
async function getJson(url: string, attempt = 0): Promise<unknown> {
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: ACCEPT } });
  if (res.status === 429 || res.status >= 500) {
    if (attempt >= 4) throw new Error(`${res.status} after ${attempt + 1} tries: ${url}`);
    await pause(1000 * 2 ** attempt);
    return getJson(url, attempt + 1);
  }
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${url}`);
  return res.json();
}

interface KitsuCharacter {
  canonicalName?: string;
  /** Localised names, e.g. { en, ja_jp }. */
  names?: Record<string, string> | null;
  otherNames?: string[] | null;
  slug?: string;
  description?: string;
  image?: Record<string, string> | null;
  malId?: string | null;
}

interface CastEntry {
  name: string;
  /** Alternate spellings, stored so search finds the name the reader knows. */
  aliases: string[];
  slug: string;
  image: string | null;
  description: string | null;
  malId: string | null;
  role: string;
}

/**
 * Main cast of one anime.
 *
 * Kitsu rejects `page[limit]` above **20** with a bare 400, so this pages at 20
 * and follows `links.next` until the cast is exhausted or we hit `maxPages`.
 * Large shows (One Piece has hundreds of credits) are capped deliberately —
 * a 40th-billed character is not "major".
 */
async function castOf(animeId: string, maxPages = 3): Promise<CastEntry[]> {
  interface Page {
    data?: { attributes?: { role?: string }; relationships?: { character?: { data?: { id?: string } } } }[];
    included?: { id: string; type: string; attributes?: KitsuCharacter }[];
    links?: { next?: string };
  }

  const out: CastEntry[] = [];
  const seen = new Set<string>();
  let url: string | undefined =
    `https://kitsu.io/api/edge/anime/${animeId}/characters?include=character&page%5Blimit%5D=20`;
  let page = 0;

  while (url && page < maxPages) {
    const d = (await getJson(url)) as Page;
    page++;

    const byId = new Map<string, KitsuCharacter>();
    for (const inc of d.included ?? []) {
      if (inc.type === "characters" && inc.attributes) byId.set(inc.id, inc.attributes);
    }

    for (const row of d.data ?? []) {
      const role = row.attributes?.role ?? "";
      if (!INCLUDE_SUPPORTING && role !== "main") continue;
      const cid = row.relationships?.character?.data?.id;
      const c = cid ? byId.get(cid) : undefined;
      if (!c?.canonicalName || seen.has(c.canonicalName)) continue;
      seen.add(c.canonicalName);
      // Kitsu orders Japanese names family-first and Western names given-first,
      // with no way to tell which is which. Storing every variant means a
      // reader searching either way finds the character.
      const aliases = [
        c.names?.en,
        c.names?.ja_jp,
        ...(c.otherNames ?? []),
      ].filter((n): n is string => !!n && n !== c.canonicalName);

      out.push({
        name: c.canonicalName,
        aliases: [...new Set(aliases)],
        slug: c.slug ?? "",
        image: c.image?.original ?? null,
        // Kitsu descriptions are HTML; the site renders plain text.
        description: c.description
          ? c.description.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim().slice(0, 400) || null
          : null,
        malId: c.malId ?? null,
        role,
      });
    }

    url = d.links?.next;
    if (url) await pause(200);
  }

  return out;
}

async function topShows(limit: number): Promise<{ id: string; title: string; favourites: number }[]> {
  if (ONLY_ANIME) {
    const d = (await getJson(`https://kitsu.io/api/edge/anime/${ONLY_ANIME}`)) as {
      data?: { id: string; attributes?: { canonicalTitle?: string; favoritesCount?: number } };
    };
    const a = d.data;
    if (!a) return [];
    return [
      {
        id: a.id,
        title: a.attributes?.canonicalTitle ?? ONLY_SERIES ?? `anime-${a.id}`,
        favourites: a.attributes?.favoritesCount ?? 0,
      },
    ];
  }

  const d = (await getJson(
    `https://kitsu.io/api/edge/anime?sort=-favoritesCount&page%5Blimit%5D=${limit}`
  )) as {
    data?: { id: string; attributes?: { canonicalTitle?: string; favoritesCount?: number } }[];
  };
  return (d.data ?? []).map((a) => ({
    id: a.id,
    title: a.attributes?.canonicalTitle ?? `anime-${a.id}`,
    favourites: a.attributes?.favoritesCount ?? 0,
  }));
}

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^\w\s-]/g, "").replace(/[\s_]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100);

/** "Naruto Shippuuden" -> "Naruto"; strips the sequel suffix that splits a franchise. */
function franchiseName(title: string): string {
  return title
    .replace(/\s*\(?\d{4}\)?$/, "")
    .replace(/:\s*.*$/, "")
    .replace(/\s+(Season|Part|Cour)\s*\d+.*$/i, "")
    .replace(/\s+(2nd|3rd|4th|Final)\s+Season.*$/i, "")
    .trim();
}

async function ensureCategory(name: string): Promise<string> {
  const slug = slugify(name);
  const existing = await prisma.category.findFirst({
    where: { OR: [{ slug }, { name }] },
    select: { id: true },
  });
  if (existing) return existing.id;

  const anime = await prisma.category.findUnique({ where: { slug: "anime-manga" }, select: { id: true } });
  const created = await prisma.category.create({
    data: { name, slug, parentId: anime?.id ?? null },
    select: { id: true },
  });
  return created.id;
}

async function main() {
  console.log(`\n${APPLY ? "APPLYING" : "DRY RUN"} — top ${TOP_SHOWS} shows by favourites\n`);

  const shows = await topShows(TOP_SHOWS);
  if (shows.length === 0) {
    console.error("no shows returned");
    process.exit(1);
  }

  let created = 0;
  let skipped = 0;

  for (const show of shows) {
    const franchise = ONLY_SERIES ?? franchiseName(show.title);
    await pause();
    let cast: CastEntry[] = [];
    try {
      cast = await castOf(show.id);
    } catch (err) {
      console.error(`  ${show.title}: FAILED — ${err instanceof Error ? err.message : err}`);
      continue;
    }
    if (cast.length === 0) {
      console.log(`  ${show.title} — no main cast returned, skipped`);
      continue;
    }

    const categoryId = APPLY ? await ensureCategory(franchise) : null;
    const lines: string[] = [];

    for (const c of cast) {
      const slug = slugify(c.name);
      if (!slug) continue;
      const exists = await prisma.profile.findUnique({ where: { slug }, select: { id: true } });
      if (exists) {
        skipped++;
        continue;
      }
      if (APPLY) {
        await prisma.profile.create({
          data: {
            name: c.name,
            slug,
            categoryId,
            description: c.description,
            imageUrl: c.image,
            source: "import:kitsu",
            externalIds: {
              kitsu: c.slug,
              ...(c.malId ? { mal: c.malId } : {}),
              ...(c.aliases.length ? { aliases: c.aliases } : {}),
            } as never,
            isVerified: false,
          },
        });
      }
      created++;
      lines.push(`${c.name}${c.image ? "" : " (no image)"}`);
    }

    console.log(`  ${show.title}  [${show.favourites.toLocaleString()} favourites] -> ${franchise}`);
    console.log(`    ${lines.join(", ") || "(all already present)"}`);
  }

  console.log(
    `\n${APPLY ? "created" : "would create"} ${created} main characters across ${shows.length} shows (${skipped} already present)\n`
  );
  if (!APPLY) console.log("re-run with --apply to write\n");
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("import failed:", err instanceof Error ? err.message : err);
  await prisma.$disconnect();
  process.exit(1);
});
