import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/session";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const streaks = await prisma.streak.findMany({
    where: { userId: session.user.id },
  });

  return NextResponse.json(streaks);
}

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Update daily login streak
  const existing = await prisma.streak.findUnique({
    where: { userId_streakType: { userId: session.user.id, streakType: "daily_login" } },
  });

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (existing) {
    const lastDate = new Date(existing.lastDate);
    lastDate.setHours(0, 0, 0, 0);

    if (lastDate.getTime() === yesterday.getTime()) {
      // Consecutive day
      await prisma.streak.update({
        where: { id: existing.id },
        data: { count: { increment: 1 }, lastDate: today },
      });
    } else if (lastDate.getTime() < yesterday.getTime()) {
      // Streak broken, reset
      await prisma.streak.update({
        where: { id: existing.id },
        data: { count: 1, lastDate: today },
      });
    }
    // else same day, no update
  } else {
    await prisma.streak.create({
      data: { userId: session.user.id, streakType: "daily_login", count: 1, lastDate: today },
    });
  }

  const streaks = await prisma.streak.findMany({
    where: { userId: session.user.id },
  });

  return NextResponse.json(streaks);
}