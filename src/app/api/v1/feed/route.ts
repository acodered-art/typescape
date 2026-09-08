import { prisma } from "@/lib/db";
import { guardV1, okWithLimit, pagination } from "@/lib/api-v1";

/**
 * GET /api/v1/feed — recent activity across the site.
 *
 * A client's home screen needs a "what happened" stream; this is the same data
 * the web feed renders, minus any per-viewer personalisation so it can be
 * cached per key.
 */
export async function GET(req: Request) {
  const guard = await guardV1(req);
  if (guard.response) return guard.response;

  const { limit, offset } = pagination(req, 20, 50);

  const [rows, total] = await Promise.all([
    prisma.activity.findMany({
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
      select: {
        id: true,
        activityType: true,
        data: true,
        createdAt: true,
        user: { select: { username: true, avatarUrl: true } },
      },
    }),
    prisma.activity.count(),
  ]);

  return okWithLimit(guard.auth, 
    rows.map((a) => ({
      id: a.id,
      type: a.activityType,
      data: a.data,
      createdAt: a.createdAt,
      user: a.user,
    })),
    { total, limit, offset }
  );
}
