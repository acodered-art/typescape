import { NextResponse } from "next/server";
import { guardCsrf } from "@/lib/csrf";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/session";
import { guardCanPost } from "@/lib/post-guard";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/client-ip";
import { moderate } from "@/lib/moderation";

// Strip HTML tags to prevent XSS
function sanitize(text: string): string {
  return text.replace(/<[^>]*>/g, "").replace(/[&<>"']/g, (c) => {
    const m: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#x27;" };
    return m[c] || c;
  });
}

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

  const comments = await prisma.comment.findMany({
    where: {
      profileId: profile.id,
      parentId: null, // only top-level; replies nested client-side
      isDeleted: false,
    },
    include: {
      user: { select: { username: true, avatarUrl: true, reputation: true } },
      replies: {
        where: { isDeleted: false },
        include: {
          user: { select: { username: true, avatarUrl: true, reputation: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // A removed comment keeps its place in the thread — so replies stay attached
  // and nobody can pretend the exchange never happened — but its body is
  // withheld and labelled as moderator action rather than author deletion.
  // This is what Reddit's "[removed by moderator]" and Discord's deletion notice
  // achieve.
  const shape = (c: (typeof comments)[number] | (typeof comments)[number]["replies"][number]) => {
    const removed = "isRemoved" in c && c.isRemoved;
    const locked = "isLocked" in c && c.isLocked;
    return {
      ...c,
      body: removed ? "[removed by a moderator]" : c.body,
      isRemoved: removed,
      isLocked: locked,
      voteCount: removed ? 0 : c.voteCount,
    };
  };

  return NextResponse.json(
    comments.map((c) => ({ ...shape(c), replies: c.replies.map(shape) }))
  );
}

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

  // A ban or timeout must actually stop writes.
  const blocked = await guardCanPost(session.user.id);
  if (blocked?.response) return blocked.response;

  const ip = clientIp(req);
  const rl = await rateLimit(`comment:${ip}`, 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many comments. Slow down." }, { status: 429 });
  }

  const { slug } = await params;
  const body = await req.json();
  const { body: text, parentId } = body;

  if (!text || typeof text !== "string" || text.trim().length === 0) {
    return NextResponse.json({ error: "Comment body required" }, { status: 400 });
  }

  if (text.length > 5000) {
    return NextResponse.json({ error: "Comment too long (max 5000 chars)" }, { status: 400 });
  }

  const profile = await prisma.profile.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // If replying, verify the parent exists, belongs to this profile, and is not
  // locked. A lock that does not stop replies would be cosmetic.
  if (parentId) {
    const parent = await prisma.comment.findUnique({
      where: { id: parentId },
      select: { profileId: true, id: true, isLocked: true },
    });
    if (!parent || parent.profileId !== profile.id) {
      return NextResponse.json({ error: "Parent comment not found" }, { status: 404 });
    }
    if (parent.isLocked) {
      return NextResponse.json({ error: "That thread is locked." }, { status: 403 });
    }
  }

  // Moderation assist. Blocking content is held rather than published; warnings
  // are queued for a moderator but do not silence discussion.
  const verdict = moderate(text);
  if (verdict.hold) {
    await prisma.moderationItem.create({
      data: {
        contentType: "comment",
        contentId: profile.id,
        flaggedBy: session.user.id,
        reason: `auto:${verdict.flags.map((f) => f.rule).join(",")}`,
        status: "pending",
      },
    });
    return NextResponse.json(
      {
        error: "This comment was held for review.",
        reasons: verdict.flags.map((f) => f.note),
      },
      { status: 422 }
    );
  }

  const comment = await prisma.comment.create({
    data: {
      profileId: profile.id,
      parentId: parentId || null,
      userId: session.user.id,
      body: sanitize(text.trim()),
    },
    include: {
      user: { select: { username: true, avatarUrl: true, reputation: true } },
    },
  });

  if (verdict.flags.length > 0) {
    await prisma.moderationItem.create({
      data: {
        contentType: "comment",
        contentId: comment.id,
        flaggedBy: session.user.id,
        reason: `auto:${verdict.flags.map((f) => f.rule).join(",")} (risk ${verdict.risk})`,
        status: "pending",
      },
    });
  }

  return NextResponse.json(
    { ...comment, moderation: verdict.flags.length > 0 ? { risk: verdict.risk, flags: verdict.flags.map((f) => f.note) } : undefined },
    { status: 201 }
  );
}