import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/session";
import { ACHIEVEMENTS, checkAchievement } from "@/lib/achievements";

export async function GET() {
  const achievements = await prisma.achievement.findMany({
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(achievements.length > 0 ? achievements : ACHIEVEMENTS);
}

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check user stats
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      _count: {
        select: { votes: true, typings: true, profiles: true, comments: true, collections: true },
      },
    },
  });

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const counts = {
    votes_cast: user._count.votes,
    typings_submitted: user._count.typings,
    profiles_created: user._count.profiles,
    comments_made: user._count.comments,
    collections_created: user._count.collections,
  };

  // Get existing achievements
  const existing = await prisma.userAchievement.findMany({
    where: { userId: session.user.id },
    select: { achievement: { select: { slug: true } } },
  });
  const existingSlugs = new Set(existing.map((e) => e.achievement.slug));

  // Get or create achievement definitions
  const newAchievements: { slug: string; name: string; description: string; icon: string }[] = [];

  for (const def of ACHIEVEMENTS) {
    if (existingSlugs.has(def.slug)) continue;

    const count = counts[def.criteria.type as keyof typeof counts] || 0;
    if (checkAchievement(def.criteria, count)) {
      // Get or create achievement record
      let achievement = await prisma.achievement.findUnique({ where: { slug: def.slug } });
      if (!achievement) {
        achievement = await prisma.achievement.create({
          data: {
            slug: def.slug,
            name: def.name,
            description: def.description,
            icon: def.icon,
            criteria: def.criteria,
          },
        });
      }

      await prisma.userAchievement.create({
        data: { userId: session.user.id, achievementId: achievement.id },
      });

      newAchievements.push(def);
    }
  }

  return NextResponse.json({ newAchievements });
}