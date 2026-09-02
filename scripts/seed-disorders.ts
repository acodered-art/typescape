import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DISORDERS = [
  // ─── Cluster A: Odd/Eccentric ──────────────────────────────
  {
    name: "Paranoid Personality Disorder",
    slug: "paranoid",
    cluster: "A",
    description: "Pervasive distrust and suspiciousness of others, interpreting motives as malevolent",
    sortOrder: 1,
  },
  {
    name: "Schizoid Personality Disorder",
    slug: "schizoid",
    cluster: "A",
    description: "Detachment from social relationships, restricted emotional expression",
    sortOrder: 2,
  },
  {
    name: "Schizotypal Personality Disorder",
    slug: "schizotypal",
    cluster: "A",
    description: "Acute discomfort with close relationships, cognitive/perceptual distortions, eccentric behavior",
    sortOrder: 3,
  },
  // ─── Cluster B: Dramatic/Emotional ─────────────────────────
  {
    name: "Antisocial Personality Disorder",
    slug: "antisocial",
    cluster: "B",
    description: "Disregard for and violation of others' rights, lack of remorse, impulsivity",
    sortOrder: 4,
  },
  {
    name: "Borderline Personality Disorder",
    slug: "borderline",
    cluster: "B",
    description: "Instability in interpersonal relationships, self-image, affect, and marked impulsivity",
    sortOrder: 5,
  },
  {
    name: "Histrionic Personality Disorder",
    slug: "histrionic",
    cluster: "B",
    description: "Excessive emotionality and attention-seeking behavior",
    sortOrder: 6,
  },
  {
    name: "Narcissistic Personality Disorder",
    slug: "narcissistic",
    cluster: "B",
    description: "Grandiosity, need for admiration, lack of empathy",
    sortOrder: 7,
  },
  // ─── Cluster C: Anxious/Fearful ────────────────────────────
  {
    name: "Avoidant Personality Disorder",
    slug: "avoidant",
    cluster: "C",
    description: "Social inhibition, feelings of inadequacy, hypersensitivity to negative evaluation",
    sortOrder: 8,
  },
  {
    name: "Dependent Personality Disorder",
    slug: "dependent",
    cluster: "C",
    description: "Excessive need to be taken care of, submissive/clinging behavior, fear of separation",
    sortOrder: 9,
  },
  {
    name: "Obsessive-Compulsive Personality Disorder",
    slug: "obsessive-compulsive",
    cluster: "C",
    description: "Preoccupation with orderliness, perfectionism, and control (distinct from OCD)",
    sortOrder: 10,
  },
  // ─── None / Other ──────────────────────────────────────────
  {
    name: "None / Other",
    slug: "none",
    cluster: "none",
    description: "No clear cluster disorder fit, or a non-DSM pattern",
    sortOrder: 11,
  },
];

// Common co-morbidity pairs (strength 0-1)
const COMORBIDITIES: { a: string; b: string; strength: number; description: string }[] = [
  { a: "borderline", b: "narcissistic", strength: 0.7, description: "Frequently co-occur; both Cluster B with emotional dysregulation" },
  { a: "borderline", b: "antisocial", strength: 0.5, description: "Shared impulsivity and emotional instability" },
  { a: "antisocial", b: "narcissistic", strength: 0.8, description: "Strong overlap in grandiosity, lack of empathy, exploitative behavior" },
  { a: "avoidant", b: "dependent", strength: 0.75, description: "Both involve social anxiety and fear of rejection" },
  { a: "schizotypal", b: "paranoid", strength: 0.7, description: "Shared suspiciousness and odd beliefs" },
  { a: "borderline", b: "histrionic", strength: 0.5, description: "Emotional volatility and attention-seeking overlap" },
  { a: "obsessive-compulsive", b: "paranoid", strength: 0.4, description: "Rigidity and hypervigilance can co-occur" },
  { a: "avoidant", b: "schizoid", strength: 0.4, description: "Social withdrawal patterns, though different motivations" },
  { a: "dependent", b: "histrionic", strength: 0.35, description: "Need for approval and attention-seeking can overlap" },
  { a: "paranoid", b: "narcissistic", strength: 0.45, description: "Grandiose suspicions and perceived persecution" },
  { a: "schizoid", b: "schizotypal", strength: 0.6, description: "Shared eccentricity and social detachment spectrum" },
  { a: "borderline", b: "avoidant", strength: 0.35, description: "Fear of abandonment and social withdrawal can co-occur" },
];

async function seed() {
  console.log("Seeding disorders...");

  // Upsert disorders
  const created = new Map<string, string>();
  for (const d of DISORDERS) {
    const disorder = await prisma.disorder.upsert({
      where: { slug: d.slug },
      update: { name: d.name, cluster: d.cluster, description: d.description, sortOrder: d.sortOrder },
      create: d,
    });
    created.set(d.slug, disorder.id);
    console.log(`  ${d.cluster === "none" ? "—" : `Cluster ${d.cluster}`}: ${d.name}`);
  }

  // Upsert comorbidities
  console.log("\nSeeding comorbidities...");
  for (const c of COMORBIDITIES) {
    const aId = created.get(c.a);
    const bId = created.get(c.b);
    if (!aId || !bId) {
      console.warn(`  Skipping comorbidity: ${c.a} ↔ ${c.b} (not found)`);
      continue;
    }
    // Ensure consistent ordering (lower UUID first) to avoid duplicate key issues
    const [disorderAId, disorderBId] = aId < bId ? [aId, bId] : [bId, aId];
    await prisma.disorderComorbidity.upsert({
      where: { disorderAId_disorderBId: { disorderAId, disorderBId } },
      update: { strength: c.strength, description: c.description },
      create: { disorderAId, disorderBId, strength: c.strength, description: c.description },
    });
    console.log(`  ${c.a} ↔ ${c.b} (${c.strength})`);
  }

  console.log("\nDone! Disorders seeded.");
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());