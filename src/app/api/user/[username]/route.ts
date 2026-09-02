import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      username: true,
      avatarUrl: true,
      bio: true,
      reputation: true,
      createdAt: true,
      _count: {
        select: {
          profiles: true,
          typings: true,
          votes: true,
          comments: true,
          collections: true,
        },
      },
      typings: {
        select: {
          typeValue: true,
          typingSystem: { select: { name: true, slug: true } },
          profile: { select: { name: true, slug: true } },
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      collections: {
        where: { isPublic: true },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(user);
}