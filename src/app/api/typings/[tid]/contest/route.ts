import { NextResponse } from "next/server";
import { guardCsrf } from "@/lib/csrf";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/client-ip";

/**
 * POST /api/typings/[tid]/contest
 *
 * Contest a reading *with a reason*. Body: { reason, sourceUrl?, sourceLabel? }.
 *
 * This is the alternative to a bare downvote. The incumbent site's core failure
 * is that a stale plurality calcifies because disagreement is just a number;
 * here disagreeing requires filing an argument, which is then votable on its own
 * merits and shows up as evidence that the reading is contested.
 *
 * One contest per reader per reading (upsert) so the same person cannot stack
 * weight against a typing.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ tid: string }> }
) {
  const csrfError = await guardCsrf(req);
  if (csrfError) return csrfError;

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in to contest a reading." }, { status: 401 });
  }

  const ip = clientIp(req);
  const rl = await rateLimit(`contest:${ip}`, 5, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many contests — slow down." }, { status: 429 });
  }

  const { tid } = await params;

  let body: { reason?: unknown; sourceUrl?: unknown; sourceLabel?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (reason.length < 20) {
    return NextResponse.json(
      { error: "Give a reason of at least 20 characters — this is an argument, not a downvote." },
      { status: 400 }
    );
  }
  if (reason.length > 2000) {
    return NextResponse.json({ error: "Keep the reason under 2000 characters." }, { status: 400 });
  }

  const sourceUrl =
    typeof body.sourceUrl === "string" && body.sourceUrl.trim() ? body.sourceUrl.trim() : null;
  if (sourceUrl) {
    let parsed: URL;
    try {
      parsed = new URL(sourceUrl);
    } catch {
      return NextResponse.json({ error: "Source must be a full URL." }, { status: 400 });
    }
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return NextResponse.json({ error: "Source must be http(s)." }, { status: 400 });
    }
  }

  const typing = await prisma.profileTyping.findUnique({
    where: { id: tid },
    select: { id: true, profileId: true },
  });
  if (!typing) {
    return NextResponse.json({ error: "Reading not found" }, { status: 404 });
  }

  const sourceLabel =
    typeof body.sourceLabel === "string" && body.sourceLabel.trim()
      ? body.sourceLabel.trim().slice(0, 100)
      : null;

  const existing = await prisma.evidence.findFirst({
    where: { profileTypingId: tid, userId: session.user.id },
    select: { id: true },
  });

  const evidence = existing
    ? await prisma.evidence.update({
        where: { id: existing.id },
        data: { evidenceText: reason, sourceUrl, sourceLabel },
      })
    : await prisma.evidence.create({
        data: {
          profileTypingId: tid,
          userId: session.user.id,
          evidenceText: reason,
          sourceUrl,
          sourceLabel,
        },
      });

  // A contest also registers disagreement with the reading, so the vote tallies
  // reflect the argument rather than only the filed reason.
  const myVote = await prisma.vote.findUnique({
    where: { profileTypingId_userId: { profileTypingId: tid, userId: session.user.id } },
  });
  if (!myVote) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { reputation: true },
    });
    const { calcVoteWeight } = await import("@/lib/utils");
    await prisma.vote.create({
      data: {
        profileTypingId: tid,
        userId: session.user.id,
        voteValue: -1,
        weight: calcVoteWeight(user?.reputation ?? 0),
      },
    });
  }

  return NextResponse.json(
    { evidence: { id: evidence.id, updated: Boolean(existing) } },
    { status: existing ? 200 : 201 }
  );
}
