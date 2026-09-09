import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cosineSimilarity, euclideanDistance } from "@/lib/traits";

/**
 * GET /api/profiles/[slug]/similar
 *
 * Rank other profiles by how close their community trait survey sits to this
 * one. When only one side has surveys there is nothing to compare, so we fall
 * back to shared typing values — still vector-ish, but honest about the
 * difference.
 *
 * Query: `?limit=` (default 6, max 24).
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const url = new URL(req.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 6, 1), 24);

  const profile = await prisma.profile.findUnique({
    where: { slug },
    select: { id: true, categoryId: true },
  });
  if (!profile) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const traits = await prisma.traitDimension.findMany({
    orderBy: { sortOrder: "asc" },
    select: { id: true, slug: true, name: true },
  });
  const traitIndex = new Map(traits.map((t, i) => [t.id, i]));

  // Every trait vote, grouped per profile. Small table; one query beats N.
  const allVotes = await prisma.traitVote.findMany({
    select: { profileId: true, traitId: true, value: true },
  });

  const vectors = new Map<string, number[]>();
  for (const v of allVotes) {
    const idx = traitIndex.get(v.traitId);
    if (idx === undefined) continue;
    if (!vectors.has(v.profileId)) vectors.set(v.profileId, new Array(traits.length).fill(0));
    // Averaging comes free: accumulate, then divide by the per-trait count.
    vectors.get(v.profileId)![idx] += v.value;
  }

  // Count contributors per profile/trait to finish the averages.
  const counts = new Map<string, number[]>();
  for (const v of allVotes) {
    const idx = traitIndex.get(v.traitId);
    if (idx === undefined) continue;
    if (!counts.has(v.profileId)) counts.set(v.profileId, new Array(traits.length).fill(0));
    counts.get(v.profileId)![idx] += 1;
  }
  for (const [pid, vec] of vectors) {
    const c = counts.get(pid)!;
    for (let i = 0; i < vec.length; i++) {
      vec[i] = c[i] > 0 ? vec[i] / c[i] : 0;
    }
  }

  const mine = vectors.get(profile.id);

  type Ranked = {
    id: string;
    slug: string;
    name: string;
    imageUrl: string | null;
    similarity: number;
    distance: number;
    sharedTraits: number;
    basis: "traits" | "typings";
  };

  const ranked: Ranked[] = [];

  if (mine) {
    const others = await prisma.profile.findMany({
      where: { id: { not: profile.id } },
      select: { id: true, slug: true, name: true, imageUrl: true },
    });

    for (const other of others) {
      const theirs = vectors.get(other.id);
      if (!theirs) continue;

      // Only compare axes both sides actually surveyed; an unvoted axis is 0
      // (the neutral midpoint) and would pull every pair toward the centre.
      const shared = traits
        .map((_, i) => i)
        .filter((i) => counts.get(profile.id)![i] > 0 && counts.get(other.id)![i] > 0);
      if (shared.length === 0) continue;

      const a = shared.map((i) => mine[i]);
      const b = shared.map((i) => theirs[i]);

      ranked.push({
        id: other.id,
        slug: other.slug,
        name: other.name,
        imageUrl: other.imageUrl,
        similarity: Math.round(cosineSimilarity(a, b) * 1000) / 1000,
        distance: Math.round(euclideanDistance(a, b) * 100) / 100,
        sharedTraits: shared.length,
        basis: "traits",
      });
    }

    ranked.sort((x, y) => y.similarity - x.similarity || x.distance - y.distance);
  }

  // Fallback: rank by shared typing values when the trait survey is too thin.
  if (ranked.length === 0) {
    const myTypings = await prisma.profileTyping.findMany({
      where: { profileId: profile.id },
      select: { typeValue: true },
    });
    const myTypes = new Set(myTypings.map((t) => t.typeValue));

    if (myTypes.size > 0) {
      const others = await prisma.profile.findMany({
        where: { id: { not: profile.id } },
        select: {
          id: true,
          slug: true,
          name: true,
          imageUrl: true,
          typings: { select: { typeValue: true } },
        },
      });
      for (const other of others) {
        const shared = other.typings.filter((t) => myTypes.has(t.typeValue)).length;
        if (shared === 0) continue;
        ranked.push({
          id: other.id,
          slug: other.slug,
          name: other.name,
          imageUrl: other.imageUrl,
          similarity: Math.round((shared / myTypes.size) * 1000) / 1000,
          distance: 0,
          sharedTraits: shared,
          basis: "typings",
        });
      }
      ranked.sort((x, y) => y.similarity - x.similarity);
    }
  }

  return NextResponse.json({
    basis: ranked[0]?.basis ?? "none",
    traitCount: mine ? traits.length : 0,
    results: ranked.slice(0, limit),
  });
}
