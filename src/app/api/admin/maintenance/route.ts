import { prisma } from "@/lib/db";
import { guardStaff, audit, cleanReason } from "@/lib/staff";
import { meiliAvailable } from "@/lib/search";

/**
 * GET  /api/admin/maintenance — operational health and counts
 * POST /api/admin/maintenance — run a maintenance action
 *
 * Admin-only (`site.maintenance`). Actions are the housekeeping a site actually
 * needs, each idempotent and safe to run twice:
 *
 *   reindex-search   rebuild the MeiliSearch profile index
 *   purge-sessions   delete expired session rows
 *   recount-consensus  recompute cached `confidence` from live votes
 *
 * Every action reports what it changed so the admin can see the effect rather
 * than trusting a "done" message.
 */

const ACTIONS = ["reindex-search", "purge-sessions", "recount-consensus"] as const;
type Action = (typeof ACTIONS)[number];

export async function GET(req: Request) {
  const guard = await guardStaff(req, "site.maintenance");
  if (!guard.staff) return guard.response;

  const now = new Date();
  const [
    users,
    comments,
    removedComments,
    profiles,
    lockedProfiles,
    pendingQueue,
    expiredSessions,
    auditRows,
    lastAudit,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.comment.count({ where: { isDeleted: false } }),
    prisma.comment.count({ where: { isRemoved: true } }),
    prisma.profile.count(),
    prisma.profile.count({ where: { isLocked: true } }),
    prisma.moderationItem.count({ where: { status: "pending" } }),
    prisma.session.count({ where: { expiresAt: { lt: now } } }),
    prisma.auditLog.count(),
    prisma.auditLog.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true, action: true } }),
  ]);

  const dbOk = await prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false);
  const searchOk = await meiliAvailable();

  return Response.json({
    data: {
      counts: {
        users,
        comments,
        removedComments,
        profiles,
        lockedProfiles,
        pendingQueue,
        expiredSessions,
        auditRows,
      },
      health: {
        database: dbOk ? "ok" : "down",
        search: searchOk ? "ok" : "unavailable",
      },
      lastAction: lastAudit?.createdAt ?? null,
      lastActionName: lastAudit?.action ?? null,
      actions: ACTIONS,
    },
  });
}

export async function POST(req: Request) {
  const guard = await guardStaff(req, "site.maintenance");
  if (!guard.staff) return guard.response;

  let body: { action?: unknown; reason?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = String(body.action ?? "") as Action;
  if (!ACTIONS.includes(action)) {
    return Response.json(
      { error: `action must be one of: ${ACTIONS.join(", ")}` },
      { status: 400 }
    );
  }

  const reason = cleanReason(body.reason);
  let result: Record<string, unknown> = {};

  if (action === "purge-sessions") {
    const { count } = await prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    result = { deleted: count };
  }

  if (action === "recount-consensus") {
    // Recompute `confidence` from the votes table for every reading. The column
    // is a cache; if a vote write ever fails halfway it can drift, and this is
    // the repair. Uses the same weighting the live path does.
    const { calcConsensus } = await import("@/lib/utils");
    const typings = await prisma.profileTyping.findMany({
      select: { id: true, confidence: true, votes: { select: { voteValue: true, weight: true } } },
    });

    let changed = 0;
    for (const t of typings) {
      if (t.votes.length === 0) continue;
      const next = calcConsensus(t.votes, 0).percentage / 100;
      if (Math.abs(next - t.confidence) > 0.0001) {
        await prisma.profileTyping.update({ where: { id: t.id }, data: { confidence: next } });
        changed++;
      }
    }
    result = { checked: typings.length, changed };
  }

  if (action === "reindex-search") {
    const { buildDocsFromDb, indexProfiles, ensureProfilesIndex } = await import("@/lib/search");
    const ready = await ensureProfilesIndex();
    if (!ready) {
      return Response.json(
        { error: "MeiliSearch is unavailable — nothing indexed." },
        { status: 503 }
      );
    }
    const docs = await buildDocsFromDb(prisma as never);
    const okIndex = await indexProfiles(docs);
    result = { indexed: okIndex ? docs.length : 0, ok: okIndex };
  }

  await audit(req, guard.staff, {
    action: `site.${action}`,
    targetType: "Site",
    targetId: action,
    targetLabel: action,
    reason,
    after: result,
  });
  return Response.json({ data: { action, result } });
}
