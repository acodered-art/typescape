/**
 * Reindex every profile into MeiliSearch.
 *
 * Run: npx tsx scripts/reindex-search.ts
 *
 * Idempotent: safe to run any time the index is missing, stale, or corrupted.
 * Exits non-zero when Meili is unreachable so a cron/systemd unit can alert,
 * but never throws a stack trace at the operator.
 */
import { prisma } from "../src/lib/db";
import {
  ensureProfilesIndex,
  indexProfiles,
  buildDocsFromDb,
  meiliAvailable,
  PROFILES_INDEX,
} from "../src/lib/search";

async function main() {
  const up = await meiliAvailable();
  if (!up) {
    console.error(
      "MeiliSearch is unreachable at",
      process.env.MEILI_URL || "http://localhost:7710"
    );
    process.exit(1);
  }

  if (!(await ensureProfilesIndex())) {
    console.error(`Could not create/configure the '${PROFILES_INDEX}' index.`);
    process.exit(1);
  }

  const docs = await buildDocsFromDb(prisma as never);
  console.log(`Indexing ${docs.length} profiles...`);

  // Send in batches so a large library does not exceed Meili's payload limit.
  const BATCH = 500;
  let indexed = 0;
  for (let i = 0; i < docs.length; i += BATCH) {
    const slice = docs.slice(i, i + BATCH);
    if (!(await indexProfiles(slice))) {
      console.error(`Failed to index batch at offset ${i}.`);
      process.exit(1);
    }
    indexed += slice.length;
    console.log(`  ${indexed}/${docs.length}`);
  }

  console.log(`Done. ${indexed} profiles indexed into '${PROFILES_INDEX}'.`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("Reindex failed:", err instanceof Error ? err.message : err);
  await prisma.$disconnect();
  process.exit(1);
});
