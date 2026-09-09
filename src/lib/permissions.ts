/**
 * Staff permissions.
 *
 * Modeled on how established platforms separate the two tiers (Wikipedia's
 * rollbacker vs sysop, Discord's per-permission moderator roles vs admin):
 *
 *   - a **moderator** handles content — the queue, removing and restoring
 *     comments, locking threads. Reversible, day-to-day work.
 *   - an **admin** additionally handles people and the site itself — roles,
 *     bans, deletion, and configuration. Irreversible or high-blast-radius.
 *
 * The split is enforced here rather than at each route, so adding a route cannot
 * accidentally grant a moderator admin power. Permissions are named, not
 * role-compared, so a new role can be given a subset without touching routes.
 *
 * Two rules the incumbent sites get right and this copies:
 *   1. **No self-targeting.** You cannot ban yourself, change your own role, or
 *      review your own content. Prevents both accidents and lockout.
 *   2. **The last admin cannot be demoted.** Otherwise the site can be left with
 *      nobody able to fix it.
 */

export type Role = "user" | "moderator" | "admin";

export const ROLES: Role[] = ["user", "moderator", "admin"];

/** Capabilities a role holds. Named so routes ask for intent, not seniority. */
export type Permission =
  | "queue.view"
  | "queue.review"
  | "comment.remove"
  | "comment.restore"
  | "comment.lock"
  | "profile.lock"
  | "profile.edit"
  | "profile.delete"
  | "user.timeout"
  | "user.ban"
  | "user.role"
  | "user.view_details"
  | "audit.view"
  | "site.maintenance";

const MODERATOR: Permission[] = [
  "queue.view",
  "queue.review",
  "comment.remove",
  "comment.restore",
  "comment.lock",
  "profile.lock",
];

const ADMIN: Permission[] = [
  ...MODERATOR,
  "profile.edit",
  "profile.delete",
  "user.timeout",
  "user.ban",
  "user.role",
  "user.view_details",
  "audit.view",
  "site.maintenance",
];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  user: [],
  moderator: MODERATOR,
  admin: ADMIN,
};

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as string[]).includes(value);
}

export function permissionsFor(role: string | null | undefined): Permission[] {
  return isRole(role) ? ROLE_PERMISSIONS[role] : [];
}

export function can(role: string | null | undefined, permission: Permission): boolean {
  return permissionsFor(role).includes(permission);
}

export function isStaff(role: string | null | undefined): boolean {
  return can(role, "queue.view");
}

/* ── guardrails ───────────────────────────────────────────── */

export type Refusal = { ok: false; status: number; error: string };
export type Allowed = { ok: true };

/**
 * A staff member must not act on themselves for people-affecting actions.
 * Reading the queue about yourself is harmless, so only the named actions block.
 */
const SELF_FORBIDDEN: Permission[] = ["user.ban", "user.timeout", "user.role"];

export function checkSelfTarget(
  actorId: string,
  targetUserId: string,
  permission: Permission
): Allowed | Refusal {
  if (SELF_FORBIDDEN.includes(permission) && actorId === targetUserId) {
    return { ok: false, status: 400, error: "You cannot apply that action to yourself." };
  }
  return { ok: true };
}

/**
 * Only an admin may change roles, and never their own. Demoting the final admin
 * would leave the site unadministrable, so that is refused too.
 */
export function checkRoleChange(
  actorId: string,
  targetUserId: string,
  nextRole: Role,
  targetIsLastAdmin: boolean
): Allowed | Refusal {
  if (actorId === targetUserId) {
    return { ok: false, status: 400, error: "You cannot change your own role." };
  }
  if (targetIsLastAdmin && nextRole !== "admin") {
    return {
      ok: false,
      status: 409,
      error: "This is the only admin. Promote someone else first.",
    };
  }
  return { ok: true };
}

/**
 * A moderator must not moderate their own content, and content by a peer at or
 * above their level is an admin matter. Prevents a moderator silencing an admin.
 */
export function checkModerateTarget(
  actorRole: string,
  actorId: string,
  target: { userId: string; role: string }
): Allowed | Refusal {
  if (target.userId === actorId) {
    return { ok: false, status: 400, error: "You cannot moderate your own content." };
  }
  if (target.role === "admin" && actorRole !== "admin") {
    return { ok: false, status: 403, error: "Only an admin can moderate an admin's content." };
  }
  return { ok: true };
}

/**
 * Status transitions. A timeout must have an end; a ban may be indefinite. A user
 * cannot be banned for zero minutes, which is how silent no-ops happen.
 */
export function validateStatusChange(
  status: string,
  until: Date | null,
  now: Date = new Date()
): Allowed | Refusal {
  if (!["active", "timeout", "banned"].includes(status)) {
    return { ok: false, status: 400, error: "status must be active, timeout or banned" };
  }
  if (status === "timeout") {
    if (!until) return { ok: false, status: 400, error: "A timeout needs an end time." };
    if (until <= now) return { ok: false, status: 400, error: "The timeout must end in the future." };
  }
  if (status === "active") return { ok: true };
  return { ok: true };
}

/**
 * Effective status, accounting for an expired timeout so a lapsed timeout does
 * not silently keep someone muted. Called on read rather than by a cron, so the
 * result is always current without a background job.
 */
export function effectiveStatus(
  user: { status: string; statusUntil: Date | null },
  now: Date = new Date()
): "active" | "timeout" | "banned" {
  if (user.status === "timeout" && user.statusUntil && user.statusUntil <= now) return "active";
  if (user.status === "timeout") return "timeout";
  if (user.status === "banned") return "banned";
  return "active";
}

/** True when the user may post (comment, vote, submit). */
export function canPost(user: { status: string; statusUntil: Date | null }, now = new Date()): boolean {
  return effectiveStatus(user, now) === "active";
}
