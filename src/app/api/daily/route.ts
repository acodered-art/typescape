import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { pickDailyCharacter, nextRollover, dayNumber } from "@/lib/daily";

/**
 * GET /api/daily
 *
 * Today's character, the same for everyone until midnight UTC. Public so the
 * homepage and the PWA can both read it without an account.
 *
 * The candidate pool is the most-viewed files with an image and at least one
 * typing — a daily pick nobody has heard of is a worse hook than a familiar one
 * with a contested reading.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  // `?date=YYYY-MM-DD` lets the page preview another day; harmless and useful
  // for testing the rollover.
  const dateParam = url.searchParams.get("date");
  const date = dateParam ? new Date(`${dateParam}T00:00:00Z`) : new Date();
  if (Number.isNaN(date.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const rows = await prisma.profile.findMany({
    where: {
      imageUrl: { not: null },
      typings: { some: {} },
    },
    select: { id: true, slug: true, name: true, imageUrl: true, viewCount: true },
    orderBy: { viewCount: "desc" },
    take: 200,
  });

  const picked = pickDailyCharacter(rows, date);
  if (!picked) {
    return NextResponse.json({ error: "No characters available" }, { status: 404 });
  }

  // The leading read + how contested it is, so the card has something to say.
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

  return NextResponse.json({
    date: date.toISOString().slice(0, 10),
    day: picked.day,
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
  });
}

/** Exported for the tests that check the date maths. */
export { dayNumber };
