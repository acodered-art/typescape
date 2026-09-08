import { prisma } from "@/lib/db";
import { guardStaff, audit, cleanReason } from "@/lib/staff";
import {
  can,
  isRole,
  checkSelfTarget,
  checkRoleChange,
  validateStatusChange,
  effectiveStatus,
} from "@/lib/permissions";

/**
 * GET   /api/admin/users — search users with moderation state
 * PATCH /api/admin/users — change a role or a status
 *
 * Replaces the previous PATCH-only route that could change `role` and nothing
 * else, and which would happily let an admin demote themselves — the fastest way
 * to leave a site with nobody able to fix it. Now:
 *   - role changes refuse self-targeting and refuse demoting the last admin
 *   - a timeout requires an end time; a ban may be indefinite
 *   - every change is audited with before/after
 *
 * The body names its intent (`action: "role" | "status"`) rather than inferring
 * it from whichever fields happen to be present.
 */

export async function GET(req: Request) {
  const guard = await guardStaff(req, "user.view_details");
  if (!guard.staff) return guard.response;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const status = searchParams.get("status") ?? "";
  const role = searchParams.get("role") ?? "";
  const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 25, 1), 100);

  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { username: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }
  if (["active", "timeout", "banned"].includes(status)) where.status = status;
  if (isRole(role)) where.role = role;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      take: limit,
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        status: true,
        statusUntil: true,
        statusReason: true,
        reputation: true,
        plan: true,
        createdAt: true,
        _count: { select: { comments: true, typings: true, votes: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return Response.json({
    data: users.map((u) => ({ ...u, effectiveStatus: effectiveStatus(u) })),
    meta: { total, limit },
  });
}

export async function PATCH(req: Request) {
  // Establish staff first, then check the specific permission so a moderator
  // gets a clear refusal rather than a generic one.
  const guard = await guardStaff(req, "queue.view");
  if (!guard.staff) return guard.response;

  let body: {
    userId?: unknown;
    action?: unknown;
    role?: unknown;
    status?: unknown;
    until?: unknown;
    reason?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const userId = typeof body.userId === "string" ? body.userId : "";
  const action = String(body.action ?? "");
  if (!userId) return Response.json({ error: "userId required" }, { status: 400 });

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      role: true,
      status: true,
      statusUntil: true,
      statusReason: true,
    },
  });
  if (!target) return Response.json({ error: "User not found" }, { status: 404 });

  /* ── role change ───────────────────────────────────────── */
  if (action === "role") {
    if (!can(guard.staff.role, "user.role")) {
      return Response.json({ error: "Only an admin can change roles." }, { status: 403 });
    }
    if (!isRole(body.role)) {
      return Response.json({ error: "role must be user, moderator or admin" }, { status: 400 });
    }

    const admins = await prisma.user.count({ where: { role: "admin" } });
    const targetIsLastAdmin = target.role === "admin" && admins <= 1;

    const selfCheck = checkSelfTarget(guard.staff.id, target.id, "user.role");
    if (!selfCheck.ok) return Response.json({ error: selfCheck.error }, { status: selfCheck.status });

    const roleCheck = checkRoleChange(guard.staff.id, target.id, body.role, targetIsLastAdmin);
    if (!roleCheck.ok) return Response.json({ error: roleCheck.error }, { status: roleCheck.status });

    await prisma.user.update({ where: { id: target.id }, data: { role: body.role } });

    await audit(req, guard.staff, {
      action: "user.role",
      targetType: "User",
      targetId: target.id,
      targetLabel: target.username,
      reason: cleanReason(body.reason),
      before: { role: target.role },
      after: { role: body.role },
    });

    return Response.json({ data: { id: target.id, role: body.role } });
  }

  /* ── status change ─────────────────────────────────────── */
  if (action === "status") {
    if (!can(guard.staff.role, "user.ban")) {
      return Response.json({ error: "Only an admin can restrict an account." }, { status: 403 });
    }

    const status = String(body.status ?? "");

    const selfCheck = checkSelfTarget(guard.staff.id, target.id, "user.ban");
    if (!selfCheck.ok) return Response.json({ error: selfCheck.error }, { status: selfCheck.status });

    if (target.role === "admin" && guard.staff.role !== "admin") {
      return Response.json({ error: "Only an admin can restrict an admin." }, { status: 403 });
    }

    let until: Date | null = null;
    if (typeof body.until === "string" && body.until.trim()) {
      const parsed = new Date(body.until);
      if (Number.isNaN(parsed.getTime())) {
        return Response.json({ error: "until must be a valid date" }, { status: 400 });
      }
      until = parsed;
    } else if (typeof body.until === "number" && Number.isFinite(body.until)) {
      // A duration in minutes is a convenience for the UI.
      until = new Date(Date.now() + body.until * 60_000);
    }

    const check = validateStatusChange(status, until);
    if (!check.ok) return Response.json({ error: check.error }, { status: check.status });

    const reason = cleanReason(body.reason);
    if (status !== "active" && !reason) {
      return Response.json({ error: "A reason is required." }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: target.id },
      data: {
        status,
        statusUntil: status === "timeout" ? until : null,
        statusReason: status === "active" ? null : reason,
      },
    });

    // A ban also withdraws their live content pending review.
    if (status === "banned") {
      await prisma.comment.updateMany({
        where: { userId: target.id, isRemoved: false },
        data: { isRemoved: true, removedBy: guard.staff.id, removedAt: new Date() },
      });
    }

    await audit(req, guard.staff, {
      action: `user.${status === "active" ? "restore" : status === "banned" ? "ban" : "timeout"}`,
      targetType: "User",
      targetId: target.id,
      targetLabel: target.username,
      reason,
      before: { status: target.status, statusUntil: target.statusUntil },
      after: { status, statusUntil: status === "timeout" ? until : null },
    });

    return Response.json({
      data: { id: target.id, status, statusUntil: status === "timeout" ? until : null },
    });
  }

  return Response.json({ error: "action must be role or status" }, { status: 400 });
}
