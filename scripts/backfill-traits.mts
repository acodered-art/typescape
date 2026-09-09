/**
 * Backfill trait surveys from the types the community already agreed on.
 *
 *   npx tsx scripts/backfill-traits.mts           # dry run
 *   npx tsx scripts/backfill-traits.mts --apply
 *   npx tsx scripts/backfill-traits.mts --apply --replace
 *
 * Why this exists: the trait survey is the richest signal on the site, but only a
 * handful of profiles have one, so similarity, the radar, emergent co-morbidity
 * and the daily pick all run near-empty. This seeds them from MBTI/Enneagram/Big
 * Five using `derive-traits.ts`, which only fills an axis the source type
 * genuinely speaks to.
 *
 * Honesty rules the script obeys:
 *   - rows are written with `source = "derived:<systems>"`, never "survey", so
 *     the site can weight and label them differently;
 *   - a derived value **never** overwrites a real survey (use --replace only if
 *     you mean it, and it still skips rows a reader wrote);
 *   - the script reports exactly what it would write before writing anything.
 */
import { prisma } from "../src/lib/db";
import { deriveVector, AXIS_ORDER } from "../src/lib/derive-traits";

const APPLY = process.argv.includes("--apply");
const REPLACE = process.argv.includes("--replace");

/** A stable, synthetic user id would be wrong; use null-on-write instead. */
interface Plan {
  profileId: string;
  slug: string;
  name: string;
  values: { traitId: string; axis: string; value: number }[];
  sources: string[];
  confidence: number;
  skipped: string[];
}

async function main() {
  const traits = await prisma.traitDimension.findMany({
    select: { id: true, slug: true },
  });
  const traitBySlug = new Map(traits.map((t) => [t.slug, t.id]));

  const profiles = await prisma.profile.findMany({
    select: {
      id: true,
      slug: true,
      name: true,
      typings: { select: { typeValue: true, typingSystem: { select: { slug: true } } } },
      traitVotes: { select: { traitId: true, source: true } },
    },
    orderBy: { name: "asc" },
  });

  const plans: Plan[] = [];

  for (const p of profiles) {
    const typings = p.typings.map((t) => ({ system: t.typingSystem.slug, type: t.typeValue }));
    if (typings.length === 0) continue;

    const derived = deriveVector(typings);
    if (derived.covered === 0) continue;

    // An axis a reader has already surveyed is left alone unless --replace,
    // and even then only derived rows are considered for removal.
    const surveyedAxes = new Set(
      p.traitVotes.filter((v) => v.source === "survey").map((v) => v.traitId)
    );

    const values: Plan["values"] = [];
    const skipped: string[] = [];

    AXIS_ORDER.forEach((axis, i) => {
      const value = derived.values[i];
      if (value === null) return;
      const traitId = traitBySlug.get(axis);
      if (!traitId) return;
      if (surveyedAxes.has(traitId)) {
        skipped.push(axis);
        return;
      }
      values.push({ traitId, axis, value });
    });

    if (values.length === 0) continue;
    plans.push({
      profileId: p.id,
      slug: p.slug,
      name: p.name,
      values,
      sources: derived.sources,
      confidence: derived.confidence,
      skipped,
    });
  }

  console.log(`\n${APPLY ? "APPLYING" : "DRY RUN"} — ${plans.length} profiles to seed\n`);
  for (const plan of plans) {
    const list = plan.values.map((v) => `${v.axis}=${v.value}`).join(" ");
    console.log(`  ${plan.name} (${plan.slug})`);
    console.log(`    from ${plan.sources.join("+")}  confidence ${plan.confidence}`);
    console.log(`    ${list}`);
    if (plan.skipped.length) console.log(`    skipped (already surveyed): ${plan.skipped.join(", ")}`);
  }

  if (!APPLY) {
    const total = plans.reduce((n, p) => n + p.values.length, 0);
    console.log(`\nwould write ${total} trait values across ${plans.length} profiles`);
    console.log("re-run with --apply to write\n");
    await prisma.$disconnect();
    return;
  }

  // Derived rows need a user. Reuse a dedicated system account so the data is
  // attributable and cannot be mistaken for a person's vote.
  const SYSTEM_USER = "typescape-derived";
  const systemUser = await prisma.user.upsert({
    where: { username: SYSTEM_USER },
    update: {},
    create: {
      username: SYSTEM_USER,
      role: "user",
      bio: "Reserved for vectors derived from community typings. Not a person.",
    },
    select: { id: true },
  });

  let written = 0;
  let removed = 0;

  for (const plan of plans) {
    const source = `derived:${plan.sources.join("+")}`;

    // Existing derived rows for this profile are replaced wholesale so a change
    // to the mapping does not leave stale axes behind.
    const { count } = await prisma.traitVote.deleteMany({
      where: {
        profileId: plan.profileId,
        userId: systemUser.id,
        ...(REPLACE ? {} : { source: { startsWith: "derived:" } }),
      },
    });
    removed += count;

    for (const v of plan.values) {
      await prisma.traitVote.upsert({
        where: {
          profileId_traitId_userId: {
            profileId: plan.profileId,
            traitId: v.traitId,
            userId: systemUser.id,
          },
        },
        update: { value: v.value, source },
        create: {
          profileId: plan.profileId,
          traitId: v.traitId,
          userId: systemUser.id,
          value: v.value,
          source,
        },
      });
      written++;
    }
  }

  console.log(`\nwrote ${written} trait values across ${plans.length} profiles (replaced ${removed})\n`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("backfill failed:", err instanceof Error ? err.message : err);
  await prisma.$disconnect();
  process.exit(1);
});
