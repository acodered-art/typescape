import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/session";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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