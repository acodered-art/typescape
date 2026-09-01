import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;

  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const achievements = await prisma.userAchievement.findMany({
    where: { userId: user.id },
    include: {
      achievement: true,
    },
    orderBy: { earnedAt: "desc" },
  });

  return NextResponse.json(achievements);
}