import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/session";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const typingId = searchParams.get("typingId");

  if (!typingId) {
    return NextResponse.json({ error: "typingId required" }, { status: 400 });
  }

  const evidence = await prisma.evidence.findMany({
    where: { profileTypingId: typingId },
    include: {
      user: { select: { username: true } },
    },
    orderBy: { voteCount: "desc" },
  });

  return NextResponse.json(evidence);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { profileTypingId, evidenceText, sourceUrl, sourceLabel } = body;

  if (!profileTypingId || !evidenceText) {
    return NextResponse.json({ error: "profileTypingId and evidenceText required" }, { status: 400 });
  }

  if (evidenceText.length > 2000) {
    return NextResponse.json({ error: "Evidence too long (max 2000 chars)" }, { status: 400 });
  }

  const typing = await prisma.profileTyping.findUnique({
    where: { id: profileTypingId },
    select: { id: true },
  });

  if (!typing) {
    return NextResponse.json({ error: "Typing not found" }, { status: 404 });
  }

  const evidence = await prisma.evidence.create({
    data: {
      profileTypingId,
      userId: session.user.id,
      evidenceText: evidenceText.trim(),
      sourceUrl: sourceUrl?.trim() || null,
      sourceLabel: sourceLabel?.trim() || null,
    },
    include: {
      user: { select: { username: true } },
    },
  });

  return NextResponse.json(evidence, { status: 201 });
}