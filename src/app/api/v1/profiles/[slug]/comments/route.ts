import { prisma } from "@/lib/db";
import { guardCanPost } from "@/lib/post-guard";
import { guardV1, okWithLimit, fail, pagination } from "@/lib/api-v1";
import { moderate } from "@/lib/moderation";

/**
 * GET  /api/v1/profiles/[slug]/comments — threaded comments
 * POST /api/v1/profiles/[slug]/comments — add one (scope `write`)
 *
 * The moderation verdict is returned on POST so a client can tell the reader why
 * something was held, instead of silently failing.
 */

function sanitize(text: string): string {
  return text.replace(/<[^>]*>/g, "").replace(/[&<>"']/g, (c) => {
    const m: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#x27;" };
    return m[c] || c;
  });
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const guard = await guardV1(req);
  if (guard.response) return guard.response;

  const { slug } = await params;
  const { limit, offset } = pagination(req, 50, 100);

  const profile = await prisma.profile.findUnique({ where: { slug }, select: { id: true } });
  if (!profile) return fail("Profile not found", 404);

  const [rows, total] = await Promise.all([
    prisma.comment.findMany({
      where: { profileId: profile.id, isDeleted: false },
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
      select: {
        id: true,
        parentId: true,
        body: true,
        voteCount: true,
        createdAt: true,
        user: { select: { username: true, avatarUrl: true, reputation: true } },
      },
    }),
    prisma.comment.count({ where: { profileId: profile.id, isDeleted: false } }),
  ]);

  return okWithLimit(guard.auth, rows, { total, limit, offset });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const guard = await guardV1(req, "write");
  if (guard.response) return guard.response;

  // A ban or timeout must actually stop writes.
  const blocked = await guardCanPost(guard.auth.user.id);
  if (blocked?.response) return blocked.response;

  const { slug } = await params;

  let body: { text?: unknown; parentId?: unknown };
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON", 400);
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (text.length < 1 || text.length > 2000) {
    return fail("Comment must be 1-2000 characters", 400);
  }

  const profile = await prisma.profile.findUnique({ where: { slug }, select: { id: true } });
  if (!profile) return fail("Profile not found", 404);

  const verdict = moderate(text);
  if (verdict.hold) {
    // Store it removed rather than discarding it: a reviewer cannot judge a
    // comment they cannot read, and the author can see what was held. The row
    // never appears publicly until the queue item is approved.
    const held = await prisma.comment.create({
      data: {
        profileId: profile.id,
        parentId: typeof body.parentId === "string" ? body.parentId : null,
        userId: guard.auth.user.id,
        body: sanitize(text),
        isRemoved: true,
      },
      select: { id: true },
    });

    await prisma.moderationItem.create({
      data: {
        contentType: "comment",
        contentId: held.id,
        flaggedBy: guard.auth.user.id,
        reason: `auto:${verdict.flags.map((f) => f.rule).join(",")} (risk ${verdict.risk})`,
        status: "pending",
      },
    });

    return Response.json(
      {
        error: "This comment was held for review.",
        reasons: verdict.flags.map((f) => f.note),
        commentId: held.id,
      },
      { status: 422 }
    );
  }

  const comment = await prisma.comment.create({
    data: {
      profileId: profile.id,
      parentId: typeof body.parentId === "string" ? body.parentId : null,
      userId: guard.auth.user.id,
      body: sanitize(text),
    },
    select: {
      id: true,
      parentId: true,
      body: true,
      voteCount: true,
      createdAt: true,
      user: { select: { username: true, avatarUrl: true, reputation: true } },
    },
  });

  return okWithLimit(guard.auth, {
    comment,
    moderation: verdict.flags.length
      ? { risk: verdict.risk, flags: verdict.flags.map((f) => f.note) }
      : null,
  });
}
