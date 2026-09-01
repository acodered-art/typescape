import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/session";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { voteValue } = body; // 1 or -1

  if (![1, -1].includes(voteValue)) {
    return NextResponse.json({ error: "voteValue must be 1 or -1" }, { status: 400 });
  }

  const comment = await prisma.comment.findUnique({ where: { id } });
  if (!comment) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  // Check existing vote
  const existing = await prisma.commentVote.findUnique({
    where: { commentId_userId: { commentId: id, userId: session.user.id } },
  });

  let delta = 0;

  if (existing) {
    if (existing.voteValue === voteValue) {
      // Remove vote (toggle off)
      await prisma.commentVote.delete({ where: { id: existing.id } });
      delta = -voteValue;
    } else {
      // Change vote
      await prisma.commentVote.update({
        where: { id: existing.id },
        data: { voteValue },
      });
      delta = voteValue * 2; // -1→1 = +2, 1→-1 = -2
    }
  } else {
    await prisma.commentVote.create({
      data: { commentId: id, userId: session.user.id, voteValue },
    });
    delta = voteValue;
  }

  // Update comment vote count
  await prisma.comment.update({
    where: { id },
    data: { voteCount: { increment: delta } },
  });

  const updated = await prisma.comment.findUnique({
    where: { id },
    select: { voteCount: true },
  });

  return NextResponse.json({ voteCount: updated?.voteCount ?? 0, myVote: existing?.voteValue === voteValue ? null : voteValue });
}