import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TRAITS = [
  { slug: "emotional-stability", name: "Emotional Stability", lowLabel: "Volatile", highLabel: "Calm", sortOrder: 1 },
  { slug: "social-orientation", name: "Social Orientation", lowLabel: "Withdrawn", highLabel: "Gregarious", sortOrder: 2 },
  { slug: "self-confidence", name: "Self-Confidence", lowLabel: "Insecure", highLabel: "Grandiose", sortOrder: 3 },
  { slug: "impulse-control", name: "Impulse Control", lowLabel: "Cautious", highLabel: "Reckless", sortOrder: 4 },
  { slug: "trust", name: "Trust", lowLabel: "Trusting", highLabel: "Suspicious", sortOrder: 5 },
  { slug: "anxiety", name: "Anxiety", lowLabel: "Fearless", highLabel: "Anxious", sortOrder: 6 },
  { slug: "conventionality", name: "Conventionality", lowLabel: "Conventional", highLabel: "Eccentric", sortOrder: 7 },
  { slug: "flexibility", name: "Flexibility", lowLabel: "Flexible", highLabel: "Rigid", sortOrder: 8 },
  { slug: "empathy", name: "Empathy", lowLabel: "Warm", highLabel: "Callous", sortOrder: 9 },
  { slug: "attention-seeking", name: "Attention-Seeking", lowLabel: "Modest", highLabel: "Dramatic", sortOrder: 10 },
  { slug: "emotional-expression", name: "Emotional Expression", lowLabel: "Restrained", highLabel: "Expressive", sortOrder: 11 },
  { slug: "conscience", name: "Conscience", lowLabel: "Principled", highLabel: "Remorseless", sortOrder: 12 },
];

// Disorder reference vectors: each disorder maps to 12 trait values (-3 to +3)
// Order matches TRAITS array above
const DISORDER_VECTORS: Record<string, number[]> = {
  paranoid:         [-1, -1, +1,  0, -3, +2,  0, +1, -1, -1,  0,  0],
  schizoid:         [+2, -3,  0, +1, +1,  0, +1, +2, -1, -2, -3, +1],
  schizotypal:      [-1, -2, -1, -1, -2, +1, -3, -1, -1, -1, -2,  0],
  antisocial:       [-1, +1, +3, +3, -2, -1,  0, -2, -3, +1, +1, -3],
  borderline:       [-3, -1, -2, +3, -2, +3,  0, -2, -1, +2, +3, -1],
  histrionic:       [-2, +3, +1, +2, +1, +1, +1, -1, -1, +3, +3,  0],
  narcissistic:     [+1, +1, +3, +1, -1, -1,  0, +1, -2, +3, +1, -2],
  avoidant:         [-1, -2, -3, +1, -1, +3,  0, +1, +1, -2, -2, +1],
  dependent:        [-1, +1, -2, +1, +2, +2, +1, +1, +2, -1, -1, +1],
  "obsessive-compulsive": [+1,  0, +1, +3, +1, +1, +1, -3,  0, -1, -1, +2],
  none:             [ 0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0],
};

async function seed() {
  console.log("Seeding trait dimensions...");

  // Upsert traits
  const traitMap = new Map<string, string>();
  for (const t of TRAITS) {
    const trait = await prisma.traitDimension.upsert({
      where: { slug: t.slug },
      update: { name: t.name, lowLabel: t.lowLabel, highLabel: t.highLabel, sortOrder: t.sortOrder },
      create: t,
    });
    traitMap.set(t.slug, trait.id);
    console.log(`  ${t.name}: ${t.lowLabel} ↔ ${t.highLabel}`);
  }

  console.log("\nSeeding disorder reference vectors...");

  // Get all disorders
  const disorders = await prisma.disorder.findMany();
  const disorderMap = new Map(disorders.map((d) => [d.slug, d.id]));

  let vectorCount = 0;
  for (const [disorderSlug, values] of Object.entries(DISORDER_VECTORS)) {
    const disorderId = disorderMap.get(disorderSlug);
    if (!disorderId) {
      console.warn(`  Skipping: disorder "${disorderSlug}" not found`);
      continue;
    }

    for (let i = 0; i < TRAITS.length; i++) {
      const traitId = traitMap.get(TRAITS[i].slug);
      if (!traitId) continue;

      await prisma.disorderTraitVector.upsert({
        where: { disorderId_traitId: { disorderId, traitId } },
        update: { value: values[i] },
        create: { disorderId, traitId, value: values[i] },
      });
      vectorCount++;
    }
    console.log(`  ${disorderSlug}: [${values.map((v) => v.toString().padStart(2)).join(", ")}]`);
  }

  console.log(`\nDone! ${vectorCount} trait vectors seeded across ${Object.keys(DISORDER_VECTORS).length} disorders.`);
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());