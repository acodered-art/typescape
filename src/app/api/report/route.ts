import { prisma } from "@/lib/db";
import { guardMutation } from "@/lib/csrf-policy";
import { auth } from "@/lib/session";
import { guardCanPost } from "@/lib/post-guard";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/client-ip";
import { moderate } from "@/lib/moderation";

/**
 * POST /api/report — a reader flags content for a moderator.
 *
 * The moderation assist catches slurs and threats automatically, but it cannot
 * judge context, a dogpile, or a bad-faith edit. Reader reports are how those
 * reach a human, so this is the counterpart to the automatic pass (the same
 * two-part design Wikipedia uses: edit filters plus recent-changes patrol).
 *
 * Body: { targetType: "comment" | "profile", targetId, reason }
 *
 * A report creates a `ModerationItem` in the same queue the automatic flags use,
 * so moderators have one place to work. Repeat reports by the same reader on the
 * same target are collapsed rather than stacking the queue.
 */

const TARGET_TYPES = ["comment", "profile"] as const;
type TargetType = (typeof TARGET_TYPES)[number];

export async function POST(req: Request) {
  // Browser: CSRF token required. Native client: the bearer token is the proof.
  const csrfError = await guardMutation(req);
  if (csrfError) return csrfError;

  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Sign in to report something." }, { status: 401 });
  }

  const blocked = await guardCanPost(session.user.id);
  if (blocked?.response) return blocked.response;

  const ip = clientIp(req);
  const rl = await rateLimit(`report:${ip}`, 10, 60_000);
  if (!rl.allowed) return Response.json({ error: "Too many reports — slow down." }, { status: 429 });

  let body: { targetType?: unknown; targetId?: unknown; reason?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const targetType = String(body.targetType ?? "") as TargetType;
  const targetId = typeof body.targetId === "string" ? body.targetId : "";
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";

  if (!TARGET_TYPES.includes(targetType)) {
    return Response.json({ error: "targetType must be comment or profile" }, { status: 400 });
  }
  if (!targetId) return Response.json({ error: "targetId required" }, { status: 400 });
  if (reason.length < 10) {
    return Response.json(
      { error: "Say why in at least 10 characters — a moderator has to act on this." },
      { status: 400 }
    );
  }
  if (reason.length > 1000) {
    return Response.json({ error: "Keep the reason under 1000 characters." }, { status: 400 });
  }

  // Confirm the target exists, and stop self-reporting (usually a mistake).
  if (targetType === "comment") {
    const comment = await prisma.comment.findUnique({
      where: { id: targetId },
      select: { id: true, userId: true, body: true, isRemoved: true },
    });
    if (!comment) return Response.json({ error: "Comment not found" }, { status: 404 });
    if (comment.userId === session.user.id) {
      return Response.json({ error: "That is your own comment." }, { status: 400 });
    }
    if (comment.isRemoved) {
      return Response.json({ error: "That comment is already removed." }, { status: 409 });
    }
  } else {
    const profile = await prisma.profile.findUnique({ where: { id: targetId }, select: { id: true } });
    if (!profile) return Response.json({ error: "Profile not found" }, { status: 404 });
  }

  // Collapse a repeat report from the same reader on the same target.
  const existing = await prisma.moderationItem.findFirst({
    where: { contentType: targetType, contentId: targetId, flaggedBy: session.user.id, status: "pending" },
    select: { id: true },
  });
  if (existing) {
    return Response.json({ data: { id: existing.id, alreadyReported: true } });
  }

  const verdict = moderate(reason);

  const item = await prisma.moderationItem.create({
    data: {
      contentType: targetType,
      contentId: targetId,
      flaggedBy: session.user.id,
      reason: `report:${reason.slice(0, 300)}${verdict.flags.length ? ` [${verdict.flags.map((f) => f.rule).join(",")}]` : ""}`,
      status: "pending",
    },
    select: { id: true },
  });

  return Response.json({ data: { id: item.id, alreadyReported: false } }, { status: 201 });
}
