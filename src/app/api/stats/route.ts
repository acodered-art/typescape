import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const [
    profileCount,
    typingCount,
    voteCount,
    userCount,
    commentCount,
    recentProfiles,
  ] = await Promise.all([
    prisma.profile.count(),
    prisma.profileTyping.count(),
    prisma.vote.count(),
    prisma.user.count(),
    prisma.comment.count(),
    prisma.profile.findMany({
      orderBy: { viewCount: "desc" },
      take: 10,
      select: { name: true, slug: true, viewCount: true },
    }),
  ]);

  return NextResponse.json({
    profiles: profileCount,
    typings: typingCount,
    votes: voteCount,
    users: userCount,
    comments: commentCount,
    trending: recentProfiles,
  });
}