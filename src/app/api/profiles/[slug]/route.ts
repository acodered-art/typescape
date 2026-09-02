import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const profile = await prisma.profile.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      categoryId: true,
      description: true,
      imageUrl: true,
      imageModeration: true,
      bio: true,
      isVerified: true,
      viewCount: true,
      createdAt: true,
      updatedAt: true,
      category: { select: { id: true, name: true, slug: true } },
      typings: {
        include: {
          typingSystem: { select: { id: true, name: true, slug: true } },
          votes: { select: { voteValue: true, weight: true } },
          creator: { select: { username: true } },
        },
      },
      _count: { select: { comments: true } },
    },
  });

  if (!profile) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Increment view count (non-blocking)
  prisma.profile.update({ where: { id: profile.id }, data: { viewCount: { increment: 1 } } }).catch(() => {});

  return NextResponse.json(profile);
}