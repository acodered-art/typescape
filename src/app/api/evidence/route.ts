import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";

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

  const ip = req.headers.get("x-forwarded-for") || "unknown";
  const rl = rateLimit(`evidence:${ip}`, 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await req.json();
  const { profileTypingId, evidenceText, sourceUrl, sourceLabel } = body;

  if (!profileTypingId || !evidenceText) {
    return NextResponse.json({ error: "profileTypingId and evidenceText required" }, { status: 400 });
  }

  if (typeof evidenceText !== "string" || evidenceText.trim().length === 0 || evidenceText.length > 2000) {
    return NextResponse.json({ error: "Evidence must be 1-2000 characters" }, { status: 400 });
  }

  if (sourceUrl && (typeof sourceUrl !== "string" || sourceUrl.length > 500)) {
    return NextResponse.json({ error: "Invalid source URL" }, { status: 400 });
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
      evidenceText: evidenceText.trim().slice(0, 2000),
      sourceUrl: sourceUrl?.trim()?.slice(0, 500) || null,
      sourceLabel: sourceLabel?.trim()?.slice(0, 200) || null,
    },
    include: {
      user: { select: { username: true } },
    },
  });

  return NextResponse.json(evidence, { status: 201 });
}