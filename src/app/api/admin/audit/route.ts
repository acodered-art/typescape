import { prisma } from "@/lib/db";
import { guardStaff } from "@/lib/staff";

/**
 * GET /api/admin/audit — the staff action log.
 *
 * Append-only and readable by admins (`audit.view`). This exists so "who hid
 * that comment and why" is answerable without asking anyone. Wikipedia logs
 * every admin action; Reddit largely does not. This follows Wikipedia.
 */
export async function GET(req: Request) {
  const guard = await guardStaff(req, "audit.view");
  if (!guard.staff) return guard.response;

  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action")?.trim() ?? "";
  const actor = searchParams.get("actor")?.trim() ?? "";
  const targetId = searchParams.get("targetId")?.trim() ?? "";
  const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 50, 1), 200);
  const offset = Math.max(Number(searchParams.get("offset")) || 0, 0);

  const where: Record<string, unknown> = {};
  if (action) where.action = { startsWith: action };
  if (targetId) where.targetId = targetId;
  if (actor) where.actorName = { contains: actor, mode: "insensitive" };

  const [rows, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  // Distinct action prefixes make a usable filter dropdown without a second call.
  const actions = await prisma.auditLog.findMany({
    distinct: ["action"],
    select: { action: true },
    orderBy: { action: "asc" },
  });

  return Response.json({
    data: rows,
    meta: { total, limit, offset, actions: actions.map((a) => a.action) },
  });
}
