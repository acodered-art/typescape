import { prisma } from "@/lib/db";
import { guardV1, okWithLimit, fail } from "@/lib/api-v1";
import { pickDailyCharacter, nextRollover } from "@/lib/daily";

/**
 * GET /api/v1/daily — today's character.
 *
 * The deterministic pick means a client can cache the response and still show
 * the same character offline. `nextRollover` lets the client schedule a refresh
 * without polling.
 */
export async function GET(req: Request) {
  const guard = await guardV1(req);
  if (guard.response) return guard.response;

  const { searchParams } = new URL(req.url);
  const dateParam = searchParams.get("date");
  const date = dateParam ? new Date(`${dateParam}T00:00:00Z`) : new Date();
  if (Number.isNaN(date.getTime())) return fail("Invalid date", 400);

  const rows = await prisma.profile.findMany({
    where: { imageUrl: { not: null }, typings: { some: {} } },
    select: { id: true, slug: true, name: true, imageUrl: true, viewCount: true },
    orderBy: { viewCount: "desc" },
    take: 200,
  });

  const picked = pickDailyCharacter(rows, date);
  if (!picked) return fail("No characters available", 404);

  const detail = await prisma.profile.findUnique({
    where: { id: picked.character.id },
    select: {
      description: true,
      category: { select: { name: true, slug: true } },
      typings: {
        select: {
          typeValue: true,
          typingSystem: { select: { name: true, slug: true } },
          votes: { select: { voteValue: true, weight: true } },
        },
      },
    },
  });

  return okWithLimit(guard.auth, 
    {
      date: date.toISOString().slice(0, 10),
      nextRollover: nextRollover(date).toISOString(),
      character: {
        ...picked.character,
        description: detail?.description ?? null,
        category: detail?.category ?? null,
        readings:
          detail?.typings.map((t) => ({
            system: t.typingSystem.slug,
            systemName: t.typingSystem.name,
            type: t.typeValue,
            votes: t.votes.length,
          })) ?? [],
      },
    },
    { deterministic: true }
  );
}
