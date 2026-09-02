import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";

// ─── Vector Math Helpers ─────────────────────────────────────

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

function euclideanDistance(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += (a[i] - b[i]) ** 2;
  }
  return Math.sqrt(sum);
}

function similarityToPercentage(similarities: { disorderId: string; similarity: number }[]): { disorderId: string; similarity: number; percentage: number }[] {
  // Shift similarities to be positive (min similarity may be negative)
  const minSim = Math.min(...similarities.map((s) => s.similarity));
  const shifted = similarities.map((s) => ({
    ...s,
    shifted: s.similarity - minSim + 0.01, // epsilon to avoid zero
  }));
  const total = shifted.reduce((sum, s) => sum + s.shifted, 0);
  return shifted.map((s) => ({
    disorderId: s.disorderId,
    similarity: Math.round(s.similarity * 1000) / 1000,
    percentage: total > 0 ? Math.round((s.shifted / total) * 100) : 0,
  }));
}

// ─── GET: Community vector + disorder similarity breakdown ────

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const profile = await prisma.profile.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // Get all trait dimensions
  const traits = await prisma.traitDimension.findMany({
    orderBy: { sortOrder: "asc" },
  });

  // Get all disorder reference vectors
  const disorderVectors = await prisma.disorderTraitVector.findMany({
    include: {
      disorder: { select: { id: true, name: true, slug: true, cluster: true } },
      trait: { select: { id: true, slug: true } },
    },
  });

  // Get all trait votes for this profile
  const traitVotes = await prisma.traitVote.findMany({
    where: { profileId: profile.id },
    include: {
      user: { select: { id: true, username: true } },
    },
  });

  // Get current user's votes
  const session = await auth();
  const myVotes = session?.user
    ? traitVotes.filter((v) => v.userId === session.user.id)
    : [];

  // Build community vector: average of all user votes per trait
  const traitAverages: { traitId: string; traitSlug: string; avg: number; count: number }[] = [];
  for (const t of traits) {
    const votes = traitVotes.filter((v) => v.traitId === t.id);
    const avg = votes.length > 0
      ? votes.reduce((sum, v) => sum + v.value, 0) / votes.length
      : 0;
    traitAverages.push({
      traitId: t.id,
      traitSlug: t.slug,
      avg: Math.round(avg * 100) / 100,
      count: votes.length,
    });
  }

  const communityVector = traitAverages.map((t) => t.avg);

  // Build my vector
  const myVectorMap = new Map(myVotes.map((v) => [v.traitId, v.value]));
  const myVector = traits.map((t) => myVectorMap.get(t.id) ?? 0);

  // Build disorder reference vectors as arrays (same trait order)
  const vectorByDisorder = new Map<string, number[]>();
  const disorderInfo = new Map<string, { id: string; name: string; slug: string; cluster: string }>();

  for (const dv of disorderVectors) {
    if (!vectorByDisorder.has(dv.disorderId)) {
      vectorByDisorder.set(dv.disorderId, new Array(traits.length).fill(0));
      disorderInfo.set(dv.disorderId, dv.disorder);
    }
    const traitIndex = traits.findIndex((t) => t.id === dv.trait.id);
    if (traitIndex >= 0) {
      vectorByDisorder.get(dv.disorderId)![traitIndex] = dv.value;
    }
  }

  // Compute similarity for each disorder
  const similarities: { disorderId: string; similarity: number; distance: number }[] = [];
  for (const [disorderId, refVector] of vectorByDisorder.entries()) {
    const sim = cosineSimilarity(communityVector, refVector);
    const dist = euclideanDistance(communityVector, refVector);
    similarities.push({ disorderId, similarity: sim, distance: Math.round(dist * 100) / 100 });
  }

  // Sort by similarity descending
  similarities.sort((a, b) => b.similarity - a.similarity);

  // Convert to percentages
  const breakdown = similarityToPercentage(similarities).map((s) => {
    const info = disorderInfo.get(s.disorderId);
    return {
      disorderId: s.disorderId,
      disorderName: info?.name ?? "",
      disorderSlug: info?.slug ?? "",
      cluster: info?.cluster ?? "",
      similarity: s.similarity,
      distance: similarities.find((x) => x.disorderId === s.disorderId)?.distance ?? 0,
      percentage: s.percentage,
    };
  });

  // Detect "None/Other" when no disorder has >15% similarity
  const topMatch = breakdown[0];
  const autoNone = topMatch && topMatch.percentage < 15;

  // Generate natural language description
  let description = "";
  if (traitVotes.length === 0) {
    description = "No votes yet. Rate this character on the trait sliders below.";
  } else if (breakdown.length > 0) {
    const top = breakdown[0];
    const second = breakdown[1];
    if (top && second && (top.percentage - second.percentage) < 5) {
      description = `Intermediate between ${top.disorderName} and ${second.disorderName}`;
    } else if (top && second && second.percentage > 15) {
      description = `${top.disorderName} with ${second.disorderName} accent`;
    } else if (autoNone) {
      description = "No clear disorder match — traits don't strongly align with any cluster";
    } else if (top) {
      description = `Codes closest to ${top.disorderName}`;
    }
  }

  return NextResponse.json({
    totalVoters: new Set(traitVotes.map((v) => v.userId)).size,
    traits: traitAverages,
    communityVector,
    myVector,
    myVotes: myVotes.map((v) => ({ traitId: v.traitId, value: v.value })),
    breakdown,
    autoNone,
    description,
  });
}

// ─── POST: Vote on a single trait ────────────────────────────

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = req.headers.get("x-forwarded-for") || "unknown";
  const rl = rateLimit(`trait-vote:${ip}`, 60, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many votes" }, { status: 429 });
  }

  const { slug } = await params;
  const body = await req.json();
  const { traitId, value } = body;

  if (!traitId || value === undefined || value === null) {
    return NextResponse.json({ error: "traitId and value required" }, { status: 400 });
  }

  if (!Number.isInteger(value) || value < -3 || value > 3) {
    return NextResponse.json({ error: "value must be an integer between -3 and +3" }, { status: 400 });
  }

  // Verify trait exists
  const trait = await prisma.traitDimension.findUnique({
    where: { id: traitId },
    select: { id: true },
  });

  if (!trait) {
    return NextResponse.json({ error: "Trait not found" }, { status: 404 });
  }

  // Verify profile exists
  const profile = await prisma.profile.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // Upsert: one vote per trait per user per character
  const existing = await prisma.traitVote.findUnique({
    where: { profileId_traitId_userId: { profileId: profile.id, traitId, userId: session.user.id } },
  });

  if (existing) {
    if (existing.value === value) {
      // Same value — toggle off (remove)
      await prisma.traitVote.delete({ where: { id: existing.id } });
      return NextResponse.json({ action: "removed", value: null });
    }
    // Change value
    await prisma.traitVote.update({
      where: { id: existing.id },
      data: { value },
    });
    return NextResponse.json({ action: "changed", value });
  }

  await prisma.traitVote.create({
    data: { profileId: profile.id, traitId, userId: session.user.id, value },
  });

  return NextResponse.json({ action: "created", value }, { status: 201 });
}