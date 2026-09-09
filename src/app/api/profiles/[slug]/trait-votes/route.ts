import { NextResponse } from "next/server";
import { guardCsrf } from "@/lib/csrf";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/client-ip";
import {
  cosineSimilarity,
  euclideanDistance,
  similarityToPercentage,
  describeBreakdown,
  emergentComorbidities,
  findInversions,
  describeInversion,
} from "@/lib/traits";

/** How much an inferred axis counts against a surveyed one. */
const DERIVED_WEIGHT = 0.35;

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
  const traitAverages: {
    traitId: string;
    traitSlug: string;
    slug: string;
    name: string;
    lowLabel: string;
    highLabel: string;
    avg: number;
    count: number;
    derivedCount: number;
    derivedOnly: boolean;
  }[] = [];
  for (const t of traits) {
    const votes = traitVotes.filter((v) => v.traitId === t.id);
    // A derived row is an inference from a type, not a reader's judgement, so it
    // counts for less than a survey. Without this the site would present
    // inference as community opinion.
    const weightOf = (source: string) => (source === "survey" ? 1 : DERIVED_WEIGHT);
    const totalWeight = votes.reduce((sum, v) => sum + weightOf(v.source), 0);
    const avg = totalWeight > 0
      ? votes.reduce((sum, v) => sum + v.value * weightOf(v.source), 0) / totalWeight
      : 0;
    traitAverages.push({
      traitId: t.id,
      traitSlug: t.slug,
      slug: t.slug,
      name: t.name,
      lowLabel: t.lowLabel,
      highLabel: t.highLabel,
      avg: Math.round(avg * 100) / 100,
      count: votes.filter((v) => v.source === "survey").length,
      derivedCount: votes.filter((v) => v.source !== "survey").length,
      /** True when every value on this axis came from derivation. */
      derivedOnly: votes.length > 0 && votes.every((v) => v.source !== "survey"),
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

  // Only readers count as voters; derived rows are attributed to a system
  // account and must not inflate the "N readers surveyed" line.
  const surveyVotes = traitVotes.filter((v) => v.source === "survey");
  const totalVoters = new Set(surveyVotes.map((v) => v.userId)).size;
  const derived = traitVotes.length > 0 && surveyVotes.length === 0;
  const verdict = describeBreakdown(breakdown, totalVoters, 15, 15, 5, traitVotes.length > 0);
  const autoNone = verdict.kind === "none";

  // `describeBreakdown` works on the minimal {disorderId, similarity,
  // percentage} shape; map back to the display name for the sentence.
  const nameOf = (id: string) => disorderInfo.get(id)?.name ?? "";

  let description = "";
  switch (verdict.kind) {
    case "empty":
      description = "No votes yet. Rate this character on the trait sliders below.";
      break;
    case "none":
      description = "No clear disorder match — traits don't strongly align with any cluster";
      break;
    case "intermediate":
      description = `Intermediate between ${nameOf(verdict.top.disorderId)} and ${nameOf(verdict.second.disorderId)}`;
      break;
    case "accent":
      description = `${nameOf(verdict.top.disorderId)} with ${nameOf(verdict.second.disorderId)} accent`;
      break;
    case "single":
      description = `Codes closest to ${nameOf(verdict.top.disorderId)}`;
      break;
  }

  // The closest pattern's reference vector, so the UI can overlay it on the
  // community survey. `null` until there is at least one vote.
  const topId = verdict.kind === "empty" || verdict.kind === "none" ? null : verdict.top.disorderId;

  // Axes where the survey contradicts the matched pattern (design §4 step 5).
  const inversions =
    topId && vectorByDisorder.has(topId)
      ? findInversions(traitAverages, vectorByDisorder.get(topId)!)
      : [];
  const topReference =
    topId && vectorByDisorder.has(topId)
      ? {
          disorderId: topId,
          name: nameOf(topId),
          values: vectorByDisorder.get(topId)!,
        }
      : null;

  return NextResponse.json({
    totalVoters,
    traits: traitAverages,
    communityVector,
    myVector,
    myVotes: myVotes.map((v) => ({ traitId: v.traitId, value: v.value })),
    breakdown,
    autoNone,
    description,
    verdict: verdict.kind,
    /** True when the whole vector was inferred, not surveyed. */
    derived,
    /** e.g. ["mbti","enneagram"] — which systems the inference came from. */
    derivedFrom: [
      ...new Set(
        traitVotes
          .filter((v) => v.source !== "survey")
          .map((v) => v.source.replace(/^derived:/, ""))
      ),
    ],
    topReference,
    inversions,
    invertedPhrase: topId ? describeInversion(nameOf(topId), inversions) : null,
    comorbidities: emergentComorbidities(breakdown).map((c) => ({
      a: { disorderId: c.a.disorderId, name: nameOf(c.a.disorderId), percentage: c.a.percentage },
      b: { disorderId: c.b.disorderId, name: nameOf(c.b.disorderId), percentage: c.b.percentage },
      strength: c.strength,
    })),
  });
}

// ─── POST: Vote on a single trait ────────────────────────────

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const csrfError = await guardCsrf(req);
  if (csrfError) return csrfError;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = clientIp(req);
  const rl = await rateLimit(`trait-vote:${ip}`, 60, 60_000);
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