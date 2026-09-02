import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = req.headers.get("x-forwarded-for") || "unknown";
  const rl = rateLimit(`test:${ip}`, 5, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many test submissions" }, { status: 429 });
  }

  const body = await req.json();
  const { testType, result, answers } = body;

  if (!testType || !result) {
    return NextResponse.json({ error: "testType and result required" }, { status: 400 });
  }

  if (!["mbti", "enneagram"].includes(testType)) {
    return NextResponse.json({ error: "Invalid testType" }, { status: 400 });
  }

  await prisma.testResult.create({
    data: {
      userId: session.user.id,
      testType,
      result,
      answers: answers || {},
    },
  });

  return NextResponse.json({ saved: true }, { status: 201 });
}