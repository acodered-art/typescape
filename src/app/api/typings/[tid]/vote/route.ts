import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/session";
import { calcConsensus, calcVoteWeight } from "@/lib/utils";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ tid: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = _req.headers.get("x-forwarded-for") || "unknown";
  const rl = rateLimit(`vote:${ip}`, 30, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many votes" }, { status: 429 });
  }

  const { tid } = await params;
  const body = await _req.json();
  const { voteValue } = body; // 1 or -1

  if (![1, -1].includes(voteValue)) {
    return NextResponse.json({ error: "voteValue must be 1 or -1" }, { status: 400 });
  }

  // Check typing exists
  const typing = await prisma.profileTyping.findUnique({
    where: { id: tid },
    include: { votes: { where: { userId: session.user.id } } },
  });

  if (!typing) {
    return NextResponse.json({ error: "Typing not found" }, { status: 404 });
  }

  // Get user rep for weight
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  const weight = calcVoteWeight(user?.reputation ?? 0);

  const existingVote = typing.votes[0];

  if (existingVote) {
    if (existingVote.voteValue === voteValue) {
      // Remove vote (toggle off)
      await prisma.vote.delete({ where: { id: existingVote.id } });
    } else {
      // Change vote
      await prisma.vote.update({
        where: { id: existingVote.id },
        data: { voteValue, weight },
      });
    }
  } else {
    await prisma.vote.create({
      data: {
        profileTypingId: tid,
        userId: session.user.id,
        voteValue,
        weight,
      },
    });
  }

  // Recalculate consensus
  const allVotes = await prisma.vote.findMany({
    where: { profileTypingId: tid },
    select: { voteValue: true, weight: true },
  });

  const consensus = calcConsensus(allVotes);

  await prisma.profileTyping.update({
    where: { id: tid },
    data: { confidence: consensus.percentage / 100 },
  });

  return NextResponse.json(consensus);
}