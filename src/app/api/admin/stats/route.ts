import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const [profileCount, typingCount, voteCount, userCount, commentCount, categoryCount] =
    await Promise.all([
      prisma.profile.count(),
      prisma.profileTyping.count(),
      prisma.vote.count(),
      prisma.user.count(),
      prisma.comment.count(),
      prisma.category.count(),
    ]);

  const topTypings = await prisma.profileTyping.groupBy({
    by: ["typingSystemId", "typeValue"],
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 20,
  });

  const topSystems = await prisma.typingSystem.findMany({
    include: { _count: { select: { typings: true } } },
  });

  return NextResponse.json({
    counts: { profiles: profileCount, typings: typingCount, votes: voteCount, users: userCount, comments: commentCount, categories: categoryCount },
    topTypings,
    topSystems,
  });
}