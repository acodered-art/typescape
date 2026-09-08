import { prisma } from "@/lib/db";
import { guardV1, okWithLimit, fail } from "@/lib/api-v1";
import { calcConsensus, calcVoteWeight } from "@/lib/utils";

/**
 * POST /api/v1/typings/[tid]/vote — agree or disagree with a reading.
 *
 * Body: { voteValue: 1 | -1 }. Toggle semantics match the web: the same value
 * again withdraws the vote.
 *
 * Auth is the bearer API key (scope `write`), not a CSRF token — there is no
 * ambient browser credential to forge, which is exactly why native clients use
 * this surface.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ tid: string }> }
) {
  const guard = await guardV1(req, "write");
  if (guard.response) return guard.response;
  const userId = guard.auth.user.id;

  const { tid } = await params;

  let body: { voteValue?: unknown };
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON", 400);
  }

  const voteValue = Number(body.voteValue);
  if (voteValue !== 1 && voteValue !== -1) {
    return fail("voteValue must be 1 or -1", 400);
  }

  const typing = await prisma.profileTyping.findUnique({
    where: { id: tid },
    select: { id: true, votes: { where: { userId }, select: { id: true, voteValue: true } } },
  });
  if (!typing) return fail("Reading not found", 404);

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { reputation: true } });
  const weight = calcVoteWeight(user?.reputation ?? 0);

  const existing = typing.votes[0];
  let action: "created" | "changed" | "removed" = "created";

  if (existing) {
    if (existing.voteValue === voteValue) {
      await prisma.vote.delete({ where: { id: existing.id } });
      action = "removed";
    } else {
      await prisma.vote.update({ where: { id: existing.id }, data: { voteValue, weight } });
      action = "changed";
    }
  } else {
    await prisma.vote.create({
      data: { profileTypingId: tid, userId, voteValue, weight },
    });
  }

  const allVotes = await prisma.vote.findMany({
    where: { profileTypingId: tid },
    select: { voteValue: true, weight: true },
  });
  const consensus = calcConsensus(allVotes);

  await prisma.profileTyping.update({
    where: { id: tid },
    data: { confidence: consensus.percentage / 100 },
  });

  return okWithLimit(guard.auth, { action, ...consensus, myVote: action === "removed" ? null : voteValue });
}
