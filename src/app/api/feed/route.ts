import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/session";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "all"; // "all" | "typings" | "votes" | "comments" | "collections"
  const limit = Math.min(Number(searchParams.get("limit")) || 30, 50);

  // Get users the current user follows
  const follows = await prisma.follow.findMany({
    where: { followerId: session.user.id },
    select: { followingId: true },
  });
  const followingIds = follows.map((f) => f.followingId);

  if (followingIds.length === 0) {
    return NextResponse.json([]);
  }

  const activities = await prisma.activity.findMany({
    where: {
      userId: { in: followingIds },
      ...(type !== "all" ? { activityType: type } : {}),
    },
    include: {
      user: { select: { username: true, avatarUrl: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json(activities);
}