import { prisma } from "@/lib/db";
import { can, isStaff, type Permission } from "@/lib/permissions";
import { auth } from "@/lib/session";
import { clientIp } from "@/lib/client-ip";

/**
 * Route-level staff guard and audit writer.
 *
 * Every staff route starts with `guardStaff(req, permission)`. Centralising it
 * means a new route cannot forget the check, and the refusal shape is identical
 * everywhere — 403 with a message that does not disclose whether the target
 * exists.
 *
 * The audit writer is deliberately separate from the guard: reading the queue is
 * not auditable, changing someone's data is. Routes pair them explicitly so it
 * is obvious which actions leave a trail.
 */

export type StaffContext = {
  id: string;
  username: string;
  role: string;
};

export type StaffGuard =
  | { staff: StaffContext; response?: never }
  | { staff?: never; response: Response };

function deny(status: number, error: string): Response {
  return Response.json({ error }, { status });
}

/**
 * Resolve the caller and assert a permission. Uses the shared `auth()` helper,
 * so this works with a cookie, a bearer session token, or NextAuth.
 */
export async function guardStaff(
  req: Request,
  permission: Permission
): Promise<StaffGuard> {
  const session = await auth();
  if (!session?.user) return { response: deny(401, "Sign in required.") };

  const role = session.user.role ?? "user";
  if (!isStaff(role)) return { response: deny(403, "Staff only.") };
  if (!can(role, permission)) {
    return { response: deny(403, "Your role cannot perform that action.") };
  }

  return {
    staff: {
      id: session.user.id,
      username: session.user.username ?? "unknown",
      role,
    },
  };
}

export interface AuditInput {
  action: string;
  targetType: string;
  targetId: string;
  targetLabel?: string | null;
  reason?: string | null;
  before?: unknown;
  after?: unknown;
}

/**
 * Append an audit row. Never throws: a logging failure must not roll back a
 * moderation action the moderator believes succeeded, and the action itself is
 * already committed by the time this runs.
 */
export async function audit(
  req: Request,
  staff: StaffContext,
  input: AuditInput
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: staff.id,
        actorName: staff.username,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        targetLabel: input.targetLabel ?? null,
        reason: input.reason ?? null,
        before: (input.before ?? null) as never,
        after: (input.after ?? null) as never,
        ip: clientIp(req),
      },
    });
  } catch {
    /* best-effort: see above */
  }
}

/** Trim and bound a moderator-supplied reason so the log stays readable. */
export function cleanReason(reason: unknown, max = 500): string | null {
  if (typeof reason !== "string") return null;
  const trimmed = reason.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}
