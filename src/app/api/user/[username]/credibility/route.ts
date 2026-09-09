import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { calcCredibility } from "@/lib/credibility";

/**
 * GET /api/user/[username]/credibility
 *
 * "This typist's votes agree with the community N% of the time." Public: the
 * whole point is that readers can see whose reads to trust.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;

  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true, username: true },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const mine = await prisma.vote.findMany({
    where: { userId: user.id },
    select: { profileTypingId: true, voteValue: true, weight: true },
  });

  if (mine.length === 0) {
    return NextResponse.json({
      username: user.username,
      score: null,
      sample: 0,
      agreed: 0,
      totalVotes: 0,
      provisional: true,
    });
  }

  // Every peer vote on the typings this reader voted on, so consensus can be
  // recomputed without them.
  const typingIds = mine.map((v) => v.profileTypingId);
  const peerRows = await prisma.vote.findMany({
    where: { profileTypingId: { in: typingIds }, userId: { not: user.id } },
    select: { profileTypingId: true, voteValue: true, weight: true },
  });

  const peers = new Map<string, { typingId: string; voteValue: number; weight: number }[]>();
  for (const p of peerRows) {
    const list = peers.get(p.profileTypingId) ?? [];
    list.push({ typingId: p.profileTypingId, voteValue: p.voteValue, weight: p.weight });
    peers.set(p.profileTypingId, list);
  }

  const credibility = calcCredibility(
    mine.map((v) => ({
      typingId: v.profileTypingId,
      voteValue: v.voteValue,
      weight: v.weight,
    })),
    peers
  );

  return NextResponse.json({ username: user.username, ...credibility });
}
