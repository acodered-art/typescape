import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";

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

  // Get all votes for this profile, grouped by disorder
  const votes = await prisma.disorderVote.findMany({
    where: { profileId: profile.id },
    include: {
      disorder: { select: { id: true, name: true, slug: true, cluster: true } },
      user: { select: { id: true, username: true } },
    },
  });

  // Get current user's vote
  const session = await auth();
  const myVote = session?.user
    ? votes.find((v) => v.userId === session.user.id) || null
    : null;

  // Aggregate: count per disorder + calculate percentages
  const totalVotes = votes.length;
  const disorderCounts = new Map<string, { count: number; disorder: { id: string; name: string; slug: string; cluster: string } }>();

  for (const v of votes) {
    const key = v.disorderId;
    if (!disorderCounts.has(key)) {
      disorderCounts.set(key, { count: 0, disorder: v.disorder });
    }
    disorderCounts.get(key)!.count++;
  }

  const breakdown = Array.from(disorderCounts.values())
    .map(({ count, disorder }) => ({
      disorderId: disorder.id,
      disorderName: disorder.name,
      disorderSlug: disorder.slug,
      cluster: disorder.cluster,
      count,
      percentage: totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  return NextResponse.json({
    totalVotes,
    breakdown,
    myVote: myVote
      ? { disorderId: myVote.disorderId, disorderName: myVote.disorder.name, disorderSlug: myVote.disorder.slug }
      : null,
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = req.headers.get("x-forwarded-for") || "unknown";
  const rl = rateLimit(`disorder-vote:${ip}`, 30, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many votes" }, { status: 429 });
  }

  const { slug } = await params;
  const body = await req.json();
  const { disorderId } = body;

  if (!disorderId) {
    return NextResponse.json({ error: "disorderId required" }, { status: 400 });
  }

  // Verify disorder exists
  const disorder = await prisma.disorder.findUnique({
    where: { id: disorderId },
    select: { id: true },
  });

  if (!disorder) {
    return NextResponse.json({ error: "Disorder not found" }, { status: 404 });
  }

  // Verify profile exists
  const profile = await prisma.profile.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // Check existing vote (one vote per user per profile)
  const existing = await prisma.disorderVote.findUnique({
    where: { profileId_userId: { profileId: profile.id, userId: session.user.id } },
  });

  if (existing) {
    if (existing.disorderId === disorderId) {
      // Same vote — toggle off (remove)
      await prisma.disorderVote.delete({ where: { id: existing.id } });
      return NextResponse.json({ action: "removed", disorderId: null });
    }
    // Change vote
    await prisma.disorderVote.update({
      where: { id: existing.id },
      data: { disorderId },
    });
    return NextResponse.json({ action: "changed", disorderId });
  }

  // Create new vote
  await prisma.disorderVote.create({
    data: {
      profileId: profile.id,
      disorderId,
      userId: session.user.id,
    },
  });

  return NextResponse.json({ action: "created", disorderId }, { status: 201 });
}