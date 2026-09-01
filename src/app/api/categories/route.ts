import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");

  if (slug) {
    // Fetch a specific category by slug (including nested)
    const category = await prisma.category.findUnique({
      where: { slug },
      include: {
        children: {
          include: { _count: { select: { profiles: true } } },
        },
        _count: { select: { profiles: true } },
      },
    });

    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    return NextResponse.json(category);
  }

  const categories = await prisma.category.findMany({
    where: { parentId: null },
    include: {
      children: {
        include: { _count: { select: { profiles: true } } },
      },
      _count: { select: { profiles: true } },
    },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json(categories);
}