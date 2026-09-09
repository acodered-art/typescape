/**
 * Reorganise the catalogue into a hierarchy a reader can actually browse.
 *
 *   npx tsx scripts/organize-categories.mts          # dry run
 *   npx tsx scripts/organize-categories.mts --apply
 *
 * Why: the importer created a category per film, so "Movies & TV" ended up with
 * 35 flat children, 24 of which held a single minor character
 * ("The Robber Kitten (1)", "Savage Sam (1)"). That is how a database looks to
 * the person who built it, not to a reader.
 *
 * What a reader expects instead:
 *
 *   Movies & TV
 *     ├── Studios          (Disney, Marvel, DC, Pixar…)
 *     ├── Franchises       (Star Wars, Harry Potter, LOTR…)
 *     └── Series           (Breaking Bad, Game of Thrones, Stranger Things…)
 *
 * Rules:
 *   - a category holding **one** profile is not a browse target; its profile
 *     moves up to the studio/franchise that owns it and the stub is deleted;
 *   - a category holding several profiles stays, but is filed under the right
 *     parent group;
 *   - nothing is deleted that still has profiles or children;
 *   - the run is idempotent and reports every move.
 */
import { prisma } from "../src/lib/db";

const APPLY = process.argv.includes("--apply");

/** Where each root group sits, and what it is called in the UI. */
const GROUPS: Record<string, string> = {
  "Movies & TV": "screen",
  "Anime & Manga": "anime",
  "Video Games": "games",
  "Books & Comics": "books",
  Celebrities: "people",
};

/**
 * Sub-groups under Movies & TV. A reader looks for "Disney" or "Marvel", not for
 * the 1967 film a single character appeared in.
 */
const MOVIE_GROUPS = [
  { name: "Studios", blurb: "Disney, Marvel, DC and the rest" },
  { name: "Franchises", blurb: "Star Wars, Harry Potter, Middle-earth" },
  { name: "Series", blurb: "TV that ran for seasons" },
  { name: "Films", blurb: "Standalone films" },
];

/**
 * Each known franchise/studio and which sub-group it belongs in. Anything not
 * listed is inferred: an imported studio name stays where it is, a series gets
 * filed under Series.
 */
/**
 * Keyed by *name*, lowercased. Slugs in this database are inconsistent — some
 * are bare ("star-wars"), some are paths ("movies-tv/breaking-bad") — so
 * matching on slug silently mis-files half the tree. Names are stable.
 */
const CLASSIFY: Record<string, "Studios" | "Franchises" | "Series" | "Films"> = {
  disney: "Studios",
  "marvel cinematic universe": "Studios",
  "dc universe": "Studios",
  pixar: "Studios",
  "star wars": "Franchises",
  "harry potter": "Franchises",
  "the lord of the rings": "Franchises",
  "rick and morty": "Franchises",
  "mary poppins": "Franchises",
  "treasure planet": "Franchises",
  "breaking bad": "Series",
  "game of thrones": "Series",
  "the office": "Series",
  "stranger things": "Series",
};


/** Studio names the Disney import produced that should collapse into "Disney". */
const DISNEY_STUDIO = "disney";

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^\w\s-]/g, "").replace(/[\s_]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100);

async function ensureChild(name: string, parentId: string, sortOrder: number): Promise<string> {
  const slug = slugify(name);
  const existing = await prisma.category.findUnique({ where: { slug }, select: { id: true } });
  if (existing) {
    // Re-parent if it exists but sits elsewhere.
    await prisma.category.update({ where: { id: existing.id }, data: { parentId } });
    return existing.id;
  }
  const created = await prisma.category.create({
    data: { name, slug, parentId, sortOrder },
    select: { id: true },
  });
  return created.id;
}

async function main() {
  console.log(`\n${APPLY ? "APPLYING" : "DRY RUN"}\n`);

  // 1. Find the root groups.
  const roots = await prisma.category.findMany({
    where: { parentId: null, name: { in: Object.keys(GROUPS) } },
    select: { id: true, name: true },
  });
  const rootByName = new Map(roots.map((r) => [r.name, r.id]));

  // 2. Create the Movies & TV sub-groups.
  const moviesRoot = rootByName.get("Movies & TV");
  const movieGroupIds = new Map<string, string>();
  if (moviesRoot) {
    for (const [i, g] of MOVIE_GROUPS.entries()) {
      const id = APPLY
        ? await ensureChild(g.name, moviesRoot, i)
        : `(would create ${g.name})`;
      movieGroupIds.set(g.name, id);
      console.log(`  group: Movies & TV / ${g.name} — ${g.blurb}`);
    }
  }

  // 3. Every category that should live under one of the movie sub-groups,
  // whether it is currently a child of Movies & TV or stranded at the root.
  const children = await prisma.category.findMany({
    where: {
      OR: [
        { parentId: moviesRoot ?? undefined },
        {
          parentId: null,
          OR: Object.keys(CLASSIFY).map((n) => ({ name: { equals: n, mode: "insensitive" as const } })),
        },
      ],
    },
    select: {
      id: true,
      name: true,
      slug: true,
      _count: { select: { profiles: true, children: true } },
    },
    orderBy: { name: "asc" },
  });

  const moves: { from: string; to: string; count: number }[] = [];
  const deleted: string[] = [];

  for (const c of children) {
    if (MOVIE_GROUPS.some((g) => g.name === c.name)) continue;

    const count = c._count.profiles;
    const target = CLASSIFY[c.name.toLowerCase()];

    // A category whose name is one of the groups themselves must not be filed
    // inside itself.
    if (MOVIE_GROUPS.some((g) => g.name === c.name)) continue;

    /**
     * A franchise a reader would search for — "Breaking Bad" — keeps its name
     * whatever its size. Only a *film title that exists solely because one minor
     * character came from it* is a stub worth collapsing.
     *
     * The distinction is which source produced it: the Disney import created one
     * category per film, and those are the noise. A named series or franchise
     * that happens to hold one profile is still a thing people look for.
     */
    const isNamedFranchise = target !== undefined;
    const profiles = await prisma.profile.findMany({
      where: { categoryId: c.id },
      select: { source: true },
    });
    const fromDisneyImport =
      profiles.length > 0 && profiles.every((p) => p.source === `import:${DISNEY_STUDIO}`);

    const isFilmStub = !isNamedFranchise && count <= 1 && c._count.children === 0 && fromDisneyImport;

    if (isFilmStub) {
      moves.push({ from: c.name, to: "Disney", count });
      if (APPLY) {
        const parentId = movieGroupIds.get("Studios")!;
        const destId = await ensureChild("Disney", parentId, 0);
        await prisma.profile.updateMany({
          where: { categoryId: c.id },
          data: { categoryId: destId },
        });
        const remaining = await prisma.profile.count({ where: { categoryId: c.id } });
        if (remaining === 0 && c._count.children === 0) {
          await prisma.category.delete({ where: { id: c.id } });
          deleted.push(c.name);
        }
      }
      continue;
    }

    // Everything else keeps its name, filed under the right group.
    const destination = target ?? (c.name.toLowerCase() === "disney" ? "Studios" : "Films");
    moves.push({ from: c.name, to: destination, count });
    if (APPLY) {
      const parentId = movieGroupIds.get(destination)!;
      await prisma.category.update({ where: { id: c.id }, data: { parentId } });
    }
  }

  console.log(`\n  ${moves.length} categories to file:`);
  for (const m of moves) console.log(`    ${m.from} (${m.count}) -> ${m.to}`);

  if (APPLY) console.log(`\n  deleted ${deleted.length} empty stubs: ${deleted.join(", ")}`);

  // 4. Remove the leftover test categories and profiles.
  const junk = await prisma.category.findMany({
    where: { OR: [{ slug: "test-franchise" }, { slug: "flow-test-franchise" }] },
    select: { id: true, name: true },
  });
  const junkProfiles = await prisma.profile.findMany({
    where: { slug: { in: ["test-character", "auth-test-character", "flow-test"] } },
    select: { id: true, name: true },
  });
  console.log(`\n  test leftovers: ${junk.map((j) => j.name).join(", ") || "none"} | profiles: ${junkProfiles.map((j) => j.name).join(", ") || "none"}`);
  if (APPLY && (junk.length || junkProfiles.length)) {
    await prisma.profile.deleteMany({ where: { id: { in: junkProfiles.map((p) => p.id) } } });
    // Only delete a category once nothing points at it.
    for (const j of junk) {
      const n = await prisma.profile.count({ where: { categoryId: j.id } });
      if (n === 0) await prisma.category.delete({ where: { id: j.id } });
    }
  }

  if (!APPLY) console.log("\nre-run with --apply to write\n");
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("organise failed:", err instanceof Error ? err.message : err);
  await prisma.$disconnect();
  process.exit(1);
});
