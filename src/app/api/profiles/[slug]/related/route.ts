import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const profile = await prisma.profile.findUnique({
    where: { slug },
    select: { id: true, categoryId: true },
  });

  if (!profile) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Find profiles in the same category, ordered by view count, exclude self
  const related = await prisma.profile.findMany({
    where: {
      id: { not: profile.id },
      categoryId: profile.categoryId,
    },
    include: {
      category: { select: { name: true, slug: true } },
      typings: {
        include: { typingSystem: { select: { name: true, slug: true } } },
        take: 3,
      },
    },
    orderBy: { viewCount: "desc" },
    take: 6,
  });

  return NextResponse.json(related);
}