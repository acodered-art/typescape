import { prisma } from "@/lib/db";
import { guardStaff, audit, cleanReason } from "@/lib/staff";

/**
 * GET  /api/mod/queue   — the review queue
 * PATCH /api/mod/queue  — approve or reject an item
 *
 * Modelled on a pending-changes queue: the moderation assist files items
 * automatically, and a human makes the call. Approving a held comment publishes
 * it; rejecting leaves it unpublished. Either way the decision is audited, so
 * "why is this hidden?" is always answerable.
 *
 * Accessible to moderators (`queue.view` / `queue.review`), not admins only —
 * the previous implementation required `role === "admin"`, which meant the
 * moderator role could not do the one job it exists for.
 */
export async function GET(req: Request) {
  const guard = await guardStaff(req, "queue.view");
  if (!guard.staff) return guard.response;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "pending";
  const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 50, 1), 100);

  if (!["pending", "approved", "rejected", "all"].includes(status)) {
    return Response.json({ error: "status must be pending, approved, rejected or all" }, { status: 400 });
  }

  const items = await prisma.moderationItem.findMany({
    where: status === "all" ? {} : { status },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      contentType: true,
      contentId: true,
      reason: true,
      status: true,
      createdAt: true,
      reviewedAt: true,
      flagger: { select: { username: true } },
      reviewer: { select: { username: true } },
    },
  });

  // Attach the actual content so a reviewer can judge it without hunting.
  const commentIds = items.filter((i) => i.contentType === "comment").map((i) => i.contentId);
  const comments = commentIds.length
    ? await prisma.comment.findMany({
        where: { id: { in: commentIds } },
        select: {
          id: true,
          body: true,
          isRemoved: true,
          createdAt: true,
          user: { select: { username: true, role: true, status: true } },
          profile: { select: { slug: true, name: true } },
        },
      })
    : [];
  const byId = new Map(comments.map((c) => [c.id, c]));

  const data = items.map((i) => ({
    ...i,
    comment: byId.get(i.contentId) ?? null,
  }));

  const pendingCount = await prisma.moderationItem.count({ where: { status: "pending" } });

  return Response.json({ data, meta: { status, pendingCount } });
}

export async function PATCH(req: Request) {
  const guard = await guardStaff(req, "queue.review");
  if (!guard.staff) return guard.response;

  let body: { id?: unknown; decision?: unknown; reason?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const id = typeof body.id === "string" ? body.id : "";
  const decision = body.decision;

  if (!id) return Response.json({ error: "id required" }, { status: 400 });
  if (decision !== "approve" && decision !== "reject") {
    return Response.json({ error: "decision must be approve or reject" }, { status: 400 });
  }

  const item = await prisma.moderationItem.findUnique({
    where: { id },
    select: { id: true, contentType: true, contentId: true, status: true, reason: true },
  });
  if (!item) return Response.json({ error: "Queue item not found" }, { status: 404 });
  if (item.status !== "pending") {
    return Response.json({ error: `This item was already ${item.status}.` }, { status: 409 });
  }

  const nextStatus = decision === "approve" ? "approved" : "rejected";

  await prisma.moderationItem.update({
    where: { id },
    data: {
      status: nextStatus,
      reviewedBy: guard.staff.id,
      reviewedAt: new Date(),
    },
  });

  // The verdict decides whether the comment is visible. Held comments are stored
  // removed, so approving publishes them and rejecting leaves them hidden. The
  // row always survives, so the author can see what happened and appeal.
  if (item.contentType === "comment") {
    const exists = await prisma.comment.findUnique({ where: { id: item.contentId }, select: { id: true } });
    if (exists) {
      await prisma.comment.update({
        where: { id: item.contentId },
        data:
          decision === "approve"
            ? { isRemoved: false, removedBy: null, removedAt: null }
            : { isRemoved: true, removedBy: guard.staff.id, removedAt: new Date() },
      });
    }
  }

  await audit(req, guard.staff, {
    action: `queue.${decision}`,
    targetType: "ModerationItem",
    targetId: item.id,
    targetLabel: `${item.contentType}:${item.contentId}`,
    reason: cleanReason(body.reason) ?? item.reason,
    before: { status: item.status },
    after: { status: nextStatus },
  });

  const pendingCount = await prisma.moderationItem.count({ where: { status: "pending" } });
  return Response.json({ data: { id, status: nextStatus }, meta: { pendingCount } });
}
