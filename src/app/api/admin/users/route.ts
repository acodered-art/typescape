import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const users = await prisma.user.findMany({
    orderBy: { reputation: "desc" },
    take: 100,
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      reputation: true,
      createdAt: true,
      _count: {
        select: {
          profiles: true,
          typings: true,
          votes: true,
          comments: true,
        },
      },
    },
  });

  return NextResponse.json(users);
}