import { prisma } from "@/lib/db";
import { guardStaff, audit, cleanReason } from "@/lib/staff";

/**
 * POST /api/mod/profiles/[slug] — lock, unlock, or annotate a character file.
 *
 * Body: { action: "lock" | "unlock" | "note", reason?, note? }
 *
 * A locked file refuses new readings and comments. `staffNote` is a
 * moderator-facing note explaining *why* — a lock with no explanation is how a
 * site feels arbitrary, and the note is what a second moderator reads before
 * deciding whether to undo the first one's decision.
 *
 * `staffNote` is never returned to the public profile payload; see the profile
 * route, which selects fields explicitly.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const guard = await guardStaff(req, "profile.lock");
  if (!guard.staff) return guard.response;

  const { slug } = await params;

  let body: { action?: unknown; reason?: unknown; note?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = String(body.action ?? "");
  if (!["lock", "unlock", "note"].includes(action)) {
    return Response.json({ error: "action must be lock, unlock or note" }, { status: 400 });
  }

  const profile = await prisma.profile.findUnique({
    where: { slug },
    select: { id: true, name: true, isLocked: true, staffNote: true },
  });
  if (!profile) return Response.json({ error: "Profile not found" }, { status: 404 });

  const reason = cleanReason(body.reason);

  if (action === "note") {
    const note = cleanReason(body.note, 1000);
    if (!note) {
      return Response.json({ error: "A note is required." }, { status: 400 });
    }
    await prisma.profile.update({ where: { id: profile.id }, data: { staffNote: note } });

    await audit(req, guard.staff, {
      action: "profile.note",
      targetType: "Profile",
      targetId: profile.id,
      targetLabel: profile.name,
      reason,
      before: { staffNote: profile.staffNote },
      after: { staffNote: note },
    });

    return Response.json({ data: { slug, staffNote: note } });
  }

  const nextLocked = action === "lock";
  if (profile.isLocked === nextLocked) {
    return Response.json(
      { error: nextLocked ? "Already locked." : "Not locked." },
      { status: 409 }
    );
  }

  // A lock changes what every reader can do, so it always carries a reason.
  if (nextLocked && !reason) {
    return Response.json({ error: "A reason is required to lock a file." }, { status: 400 });
  }

  await prisma.profile.update({
    where: { id: profile.id },
    data: {
      isLocked: nextLocked,
      // Locking records the reason as the staff note; unlocking clears it so a
      // stale explanation does not linger.
      staffNote: nextLocked ? (reason ?? profile.staffNote) : null,
    },
  });

  await audit(req, guard.staff, {
    action: nextLocked ? "profile.lock" : "profile.unlock",
    targetType: "Profile",
    targetId: profile.id,
    targetLabel: profile.name,
    reason,
    before: { isLocked: profile.isLocked },
    after: { isLocked: nextLocked },
  });

  return Response.json({ data: { slug, isLocked: nextLocked } });
}
