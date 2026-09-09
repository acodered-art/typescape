import { guardV1, okWithLimit } from "@/lib/api-v1";
import { prisma } from "@/lib/db";

/**
 * GET /api/v1/me — the key owner's own identity, plan, and quota.
 *
 * Lets a client show the signed-in state and warn before it exhausts a rate
 * limit, without needing a separate session endpoint.
 */
export async function GET(req: Request) {
  const guard = await guardV1(req);
  if (guard.response) return guard.response;

  const user = await prisma.user.findUnique({
    where: { id: guard.auth.user.id },
    select: {
      id: true,
      username: true,
      reputation: true,
      role: true,
      ownType: true,
      plan: true,
      _count: { select: { typings: true, votes: true, comments: true, collections: true } },
    },
  });

  if (!user) return okWithLimit(guard.auth, null);

  return okWithLimit(guard.auth, {
    id: user.id,
    username: user.username,
    reputation: user.reputation,
    role: user.role,
    ownType: user.ownType,
    plan: guard.auth.plan,
    counts: user._count,
  });
}
