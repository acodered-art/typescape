import { prisma } from "@/lib/db";
import { effectiveStatus, type Role } from "./permissions";

/**
 * Enforce account status on write paths.
 *
 * A ban or timeout is only real if it stops the writes, so every mutating route
 * calls this before doing anything. The check is on the *effective* status, so a
 * lapsed timeout stops blocking without a background job.
 *
 * Returns null when the caller may proceed, or a response explaining why not.
 * The message is deliberately user-facing and includes the reason and the end
 * time, because "403 Forbidden" teaches the user nothing.
 */

export type PostGuard = { response?: Response };

export async function guardCanPost(userId: string): Promise<PostGuard | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { status: true, statusUntil: true, statusReason: true },
  });
  if (!user) return { response: Response.json({ error: "Account not found." }, { status: 404 }) };

  const status = effectiveStatus(user);
  if (status === "active") return null;

  const until =
    status === "timeout" && user.statusUntil
      ? ` This ends ${user.statusUntil.toISOString().replace("T", " ").slice(0, 16)} UTC.`
      : "";

  return {
    response: Response.json(
      {
        error:
          status === "banned"
            ? "Your account is suspended and cannot post."
            : "Your account is timed out and cannot post right now.",
        status,
        reason: user.statusReason ?? null,
        until: status === "timeout" ? user.statusUntil : null,
        detail: until.trim() || undefined,
      },
      { status: 403 }
    ),
  };
}

/** Convenience for routes that already hold a session user object. */
export async function guardSessionCanPost(user: { id: string } | undefined): Promise<PostGuard | null> {
  if (!user) return { response: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  return guardCanPost(user.id);
}

export type { Role };
