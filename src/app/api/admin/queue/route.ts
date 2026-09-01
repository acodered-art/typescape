import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const queue = await prisma.moderationItem.findMany({
    where: { status: "pending" },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      flagger: { select: { username: true } },
    },
  });

  return NextResponse.json(queue);
}