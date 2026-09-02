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

  // Get or create today's challenge
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let challenge = await prisma.dailyChallenge.findUnique({
    where: { date: today },
  });

  if (!challenge) {
    // Create a random challenge for today
    const challenges = [
      { title: "Type 3 Characters", description: "Submit personality typings for 3 different profiles", challengeType: "type_profile", target: 3, reward: 30 },
      { title: "Vote on 5 Typings", description: "Cast your vote on 5 personality typings", challengeType: "vote", target: 5, reward: 25 },
      { title: "Leave 2 Comments", description: "Share your thoughts on 2 profiles", challengeType: "comment", target: 2, reward: 20 },
      { title: "Take a Test", description: "Complete an MBTI or Enneagram test", challengeType: "test", target: 1, reward: 15 },
      { title: "Create a Profile", description: "Add a new character or celebrity to the database", challengeType: "type_profile", target: 1, reward: 20 },
      { title: "Vote on 10 Typings", description: "Cast your vote on 10 personality typings", challengeType: "vote", target: 10, reward: 40 },
    ];
    const pick = challenges[Math.floor(Math.random() * challenges.length)];
    challenge = await prisma.dailyChallenge.create({
      data: { date: today, ...pick },
    });
  }

  // Check user's progress on this challenge
  const completion = await prisma.userChallengeCompletion.findUnique({
    where: { userId_challengeId: { userId: session.user.id, challengeId: challenge.id } },
  });

  // Calculate progress based on challenge type
  let progress = 0;
  if (completion) {
    progress = completion.progress;
  } else {
    // Count today's activity
    const todayStart = today;
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const whereClause = {
      userId: session.user.id,
      createdAt: { gte: todayStart, lt: tomorrow },
    };

    switch (challenge.challengeType) {
      case "type_profile":
        progress = await prisma.profileTyping.count({ where: whereClause });
        break;
      case "vote":
        progress = await prisma.vote.count({ where: whereClause });
        break;
      case "comment":
        progress = await prisma.comment.count({ where: whereClause });
        break;
      case "test":
        progress = await prisma.testResult.count({ where: whereClause });
        break;
    }
  }

  return NextResponse.json({ challenge, progress, target: challenge.target, completed: progress >= challenge.target });
}