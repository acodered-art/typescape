import { prisma } from "@/lib/db";
import { guardStaff, audit, cleanReason } from "@/lib/staff";
import { checkModerateTarget, can } from "@/lib/permissions";

/**
 * POST /api/mod/comments/[id] — remove, restore, or lock a comment.
 *
 * Body: { action: "remove" | "restore" | "lock" | "unlock", reason?: string }
 *
 * Removal is **soft** and reversible: the row keeps `isRemoved`, who did it, and
 * when, so the author sees "removed by a moderator" rather than a silently
 * vanished thread, and a moderator can undo a mistake. This mirrors how Discord
 * and Reddit treat removal (hidden from regular users, visible to staff) and
 * avoids the destructive delete that the previous surface had no way to perform
 * safely at all.
 *
 * Peer protection: a moderator cannot act on their own content or on an admin's.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // The exact permission is resolved per action below; this only establishes
  // that the caller is staff and gets us a member-level gate first.
  const guard = await guardStaff(req, "comment.remove");
  if (!guard.staff) return guard.response;

  const { id } = await params;

  let body: { action?: unknown; reason?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = body.action;
  if (!["remove", "restore", "lock", "unlock"].includes(String(action))) {
    return Response.json(
      { error: "action must be remove, restore, lock or unlock" },
      { status: 400 }
    );
  }

  const comment = await prisma.comment.findUnique({
    where: { id },
    select: {
      id: true,
      body: true,
      isRemoved: true,
      isLocked: true,
      userId: true,
      profile: { select: { slug: true, name: true } },
      user: { select: { username: true, role: true, status: true } },
    },
  });
  if (!comment) return Response.json({ error: "Comment not found" }, { status: 404 });

  const permissionByAction = {
    remove: "comment.remove",
    restore: "comment.restore",
    lock: "comment.lock",
    unlock: "comment.lock",
  } as const;
  const required = permissionByAction[action as keyof typeof permissionByAction];

  // Re-check the finer permission: the gate above only established staff.
  if (!can(guard.staff.role, required)) {
    return Response.json({ error: "Your role cannot perform that action." }, { status: 403 });
  }

  const targetCheck = checkModerateTarget(guard.staff.role, guard.staff.id, {
    userId: comment.userId,
    role: comment.user.role,
  });
  if (!targetCheck.ok) {
    return Response.json({ error: targetCheck.error }, { status: targetCheck.status });
  }

  const reason = cleanReason(body.reason);

  if (action === "remove" || action === "restore") {
    if (action === "remove" && comment.isRemoved) {
      return Response.json({ error: "Already removed." }, { status: 409 });
    }
    if (action === "restore" && !comment.isRemoved) {
      return Response.json({ error: "Not removed." }, { status: 409 });
    }

    await prisma.comment.update({
      where: { id },
      data:
        action === "remove"
          ? { isRemoved: true, removedBy: guard.staff.id, removedAt: new Date() }
          : { isRemoved: false, removedBy: null, removedAt: null },
    });

    await audit(req, guard.staff, {
      action: `comment.${action}`,
      targetType: "Comment",
      targetId: comment.id,
      targetLabel: `${comment.user.username} on ${comment.profile.name}`,
      reason,
      before: { isRemoved: comment.isRemoved },
      after: { isRemoved: action === "remove" },
    });

    return Response.json({ data: { id: comment.id, isRemoved: action === "remove" } });
  }

  // lock / unlock
  const nextLocked = action === "lock";
  if (comment.isLocked === nextLocked) {
    return Response.json({ error: nextLocked ? "Already locked." : "Not locked." }, { status: 409 });
  }

  await prisma.comment.update({ where: { id }, data: { isLocked: nextLocked } });

  await audit(req, guard.staff, {
    action: `comment.${action}`,
    targetType: "Comment",
    targetId: comment.id,
    targetLabel: `${comment.user.username} on ${comment.profile.name}`,
    reason,
    before: { isLocked: comment.isLocked },
    after: { isLocked: nextLocked },
  });

  return Response.json({ data: { id: comment.id, isLocked: nextLocked } });
}
