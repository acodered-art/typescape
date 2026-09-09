/**
 * Import character skeletons from openly-licensed sources.
 *
 *   npx tsx scripts/import-characters.mts                        # dry run, capped
 *   npx tsx scripts/import-characters.mts --source swapi --apply
 *   npx tsx scripts/import-characters.mts --source disney --limit 200 --apply
 *
 * The default cap is 60 per source. A source with thousands of rows is mostly
 * minor characters, and burying the community's own files under them makes the
 * catalogue worse, not better.
 *
 * What a skeleton is: name, canonical image, and which franchise it belongs to.
 * **No personality types.** Types are the community's work and the only thing
 * that makes the site worth reading; importing them from another database would
 * also mean importing that database's licence problem.
 *
 * Every imported row is stamped `source = "import:<provider>"` so it is
 * filterable, attributable, and never confused with a reader-created file.
 *
 * Only sources with a clear open licence are wired in here. Anything whose terms
 * are unclear or prohibit commercial use is deliberately absent — see
 * `docs/DATA-SOURCES.md`.
 */
import { prisma } from "../src/lib/db";

const ARGS = process.argv.slice(2);
const APPLY = ARGS.includes("--apply");
const argValue = (name: string): string | null => {
  const i = ARGS.indexOf(name);
  return i >= 0 && ARGS[i + 1] ? ARGS[i + 1] : null;
};
const ONLY = argValue("--source");
/**
 * A cap per source, not per run. Importing all 9,800 Disney rows would bury the
 * community's own files under obscure alphabetically-first characters, so the
 * default is deliberately small and `--limit` is opt-in.
 */
const LIMIT = Number(argValue("--limit")) || 60;

const UA = "TypeScape/0.1 (+https://typescape.walker-fg.uk; character import)";

interface Skeleton {
  name: string;
  imageUrl: string | null;
  description: string | null;
  /** Franchise/series name; created as a category if missing. */
  franchise: string;
  /** Parent category slug under which the franchise sits. */
  parentSlug: string;
  /** External ids for attribution and future dedupe. */
  externalIds: Record<string, string>;
}

interface Source {
  key: string;
  label: string;
  /** Why we are allowed to use it. Shown in the summary. */
  licence: string;
  fetch(limit: number): Promise<Skeleton[]>;
}

/**
 * Fetch JSON with backoff on 429/5xx. These are free fan APIs with unpublished
 * limits; hammering them would be both rude and self-defeating.
 */
async function getJson(url: string, accept = "application/json", attempt = 0): Promise<unknown> {
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: accept } });
  if (res.status === 429 || res.status >= 500) {
    if (attempt >= 4) throw new Error(`${res.status} after ${attempt + 1} attempts for ${url}`);
    const wait = 1000 * 2 ** attempt;
    await new Promise((r) => setTimeout(r, wait));
    return getJson(url, accept, attempt + 1);
  }
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.json();
}

/** Politeness delay between sequential page requests. */
const pause = (ms = 250) => new Promise((r) => setTimeout(r, ms));

/* ── SWAPI (Star Wars) ─────────────────────────────────────── */

const swapi: Source = {
  key: "swapi",
  label: "SWAPI (Star Wars)",
  licence: "Public/fan API derived from Lucasfilm material; widely used, no commercial restriction asserted",
  async fetch(limit) {
    const out: Skeleton[] = [];
    // The API pages 10 at a time.
    for (let page = 1; out.length < limit && page <= 20; page++) {
      const data = (await getJson(`https://www.swapi.tech/api/people?page=${page}&limit=10`)) as {
        results?: { uid: string; name: string; url: string }[];
      };
      const results = data.results ?? [];
      if (results.length === 0) break;
      await pause();
      for (const p of results) {
        if (out.length >= limit) break;
        out.push({
          name: p.name,
          // swapi.tech exposes a deterministic image path per uid.
          imageUrl: `https://images.swapi.tech/characters/${p.uid}.jpg`,
          description: null,
          franchise: "Star Wars",
          parentSlug: "movies-tv",
          externalIds: { swapi: p.uid },
        });
      }
      if (results.length < 10) break;
    }
    return out;
  },
};

/* ── Rick and Morty ────────────────────────────────────────── */

const rickAndMorty: Source = {
  key: "rickandmorty",
  label: "Rick and Morty API",
  licence: "Open/free API, no key, no commercial restriction asserted",
  async fetch(limit) {
    const out: Skeleton[] = [];
    const first = (await getJson("https://rickandmortyapi.com/api/character")) as {
      info: { pages: number };
      results: { id: number; name: string; image: string; species: string; status: string }[];
    };
    const pages = Math.min(first.info.pages, Math.ceil(limit / 20) + 1);

    const push = (c: { id: number; name: string; image: string; species: string; status: string }) => {
      out.push({
        name: c.name,
        imageUrl: c.image || null,
        description: `${c.status} ${c.species}`.trim() || null,
        franchise: "Rick and Morty",
        parentSlug: "movies-tv",
        externalIds: { rickandmorty: String(c.id) },
      });
    };

    for (const c of first.results) {
      if (out.length >= limit) return out;
      push(c);
    }
    for (let page = 2; page <= pages; page++) {
      await pause();
      const d = (await getJson(`https://rickandmortyapi.com/api/character?page=${page}`)) as {
        results: { id: number; name: string; image: string; species: string; status: string }[];
      };
      for (const c of d.results) {
        if (out.length >= limit) return out;
        push(c);
      }
    }
    return out;
  },
};

/* ── Disney ────────────────────────────────────────────────── */

const disney: Source = {
  key: "disney",
  label: "Disney Character API",
  licence: "Open/free fan API, no key, no commercial restriction asserted",
  async fetch(limit) {
    const out: Skeleton[] = [];
    const pageSize = Math.min(limit, 50);
    let page = 1;
    while (out.length < limit && page <= 200) {
      await pause();
      const d = (await getJson(
        `https://api.disneyapi.dev/character?page=${page}&pageSize=${pageSize}`
      )) as {
        data?: { _id: number; name: string; imageUrl?: string; films?: string[]; sourceUrl?: string }[];
      };
      const rows = d.data ?? [];
      if (rows.length === 0) break;
      for (const c of rows) {
        if (out.length >= limit) return out;
        const franchise = c.films?.[0]?.replace(/\s*\(.*\)\s*$/, "").trim() || "Disney";
        out.push({
          name: c.name,
          imageUrl: c.imageUrl || null,
          description: c.films?.length ? `Appears in ${c.films.slice(0, 3).join(", ")}` : null,
          franchise,
          parentSlug: "movies-tv",
          externalIds: { disney: String(c._id) },
        });
      }
      if (rows.length < pageSize) break;
      page++;
    }
    return out;
  },
};

const SOURCES: Source[] = [swapi, rickAndMorty, disney];

/* ── runner ────────────────────────────────────────────────── */

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^\w\s-]/g, "").replace(/[\s_]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100);

async function ensureCategory(name: string, parentSlug: string): Promise<string> {
  const slug = slugify(name);
  const parent = await prisma.category.findUnique({ where: { slug: parentSlug }, select: { id: true } });
  const existing = await prisma.category.findUnique({ where: { slug }, select: { id: true } });
  if (existing) return existing.id;
  const created = await prisma.category.create({
    data: { name, slug, parentId: parent?.id ?? null },
    select: { id: true },
  });
  return created.id;
}

async function main() {
  const chosen = ONLY ? SOURCES.filter((s) => s.key === ONLY) : SOURCES;
  if (chosen.length === 0) {
    console.error(`unknown --source. options: ${SOURCES.map((s) => s.key).join(", ")}`);
    process.exit(1);
  }

  console.log(`\n${APPLY ? "APPLYING" : "DRY RUN"} — ${chosen.length} source(s)\n`);

  let totalNew = 0;
  let totalSkipped = 0;

  for (const source of chosen) {
    let skeletons: Skeleton[] = [];
    try {
      skeletons = await source.fetch(LIMIT);
    } catch (err) {
      console.error(`  ${source.label}: FAILED — ${err instanceof Error ? err.message : err}`);
      continue;
    }

    // Skip anything already present by slug, so re-running is safe.
    const categoryIds = new Map<string, string>();
    let created = 0;
    let skipped = 0;

    for (const s of skeletons) {
      const slug = slugify(s.name);
      if (!slug) {
        skipped++;
        continue;
      }
      const exists = await prisma.profile.findUnique({ where: { slug }, select: { id: true } });
      if (exists) {
        skipped++;
        continue;
      }
      if (!APPLY) {
        created++;
        continue;
      }

      const catKey = `${s.franchise}|${s.parentSlug}`;
      if (!categoryIds.has(catKey)) {
        categoryIds.set(catKey, await ensureCategory(s.franchise, s.parentSlug));
      }

      await prisma.profile.create({
        data: {
          name: s.name,
          slug,
          categoryId: categoryIds.get(catKey),
          description: s.description,
          imageUrl: s.imageUrl,
          source: `import:${source.key}`,
          externalIds: s.externalIds as never,
          isVerified: false,
        },
      });
      created++;
    }

    console.log(`  ${source.label}`);
    console.log(`    licence: ${source.licence}`);
    console.log(`    fetched ${skeletons.length} → ${created} ${APPLY ? "created" : "would create"}, ${skipped} already present`);
    totalNew += created;
    totalSkipped += skipped;
  }

  console.log(
    `\n${APPLY ? "created" : "would create"} ${totalNew} profiles (${totalSkipped} already present)\n`
  );
  if (!APPLY) console.log("re-run with --apply to write\n");
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("import failed:", err instanceof Error ? err.message : err);
  await prisma.$disconnect();
  process.exit(1);
});
