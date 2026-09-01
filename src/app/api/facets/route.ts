import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";

  // Build a base WHERE for filtering
  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }

  // Count profiles per category
  const categoryCounts = await prisma.profile.groupBy({
    by: ["categoryId"],
    where: Object.keys(where).length > 0 ? where : undefined,
    _count: { id: true },
  });

  // Get category names
  const categoryIds = categoryCounts.map((c) => c.categoryId).filter(Boolean) as string[];
  const categories = categoryIds.length > 0
    ? await prisma.category.findMany({
        where: { id: { in: categoryIds } },
        select: { id: true, name: true, slug: true },
      })
    : [];

  const categoryFacets = categoryCounts
    .filter((c) => c.categoryId)
    .map((c) => {
      const cat = categories.find((x) => x.id === c.categoryId);
      return { slug: cat?.slug || "", name: cat?.name || "Uncategorized", count: c._count.id };
    })
    .sort((a, b) => b.count - a.count);

  // Count profiles per type (top 20)
  const typeCounts = await prisma.profileTyping.groupBy({
    by: ["typeValue", "typingSystemId"],
    _count: { profileId: true },
    orderBy: { _count: { profileId: "desc" } },
    take: 20,
  });

  // Get system names
  const systemIds = [...new Set(typeCounts.map((t) => t.typingSystemId))];
  const systems = systemIds.length > 0
    ? await prisma.typingSystem.findMany({
        where: { id: { in: systemIds } },
        select: { id: true, name: true, slug: true },
      })
    : [];

  const typeFacets = typeCounts.map((t) => {
    const sys = systems.find((s) => s.id === t.typingSystemId);
    return {
      typeValue: t.typeValue,
      systemSlug: sys?.slug || "",
      systemName: sys?.name || "",
      count: t._count.profileId,
    };
  });

  // Total profile count
  const total = await prisma.profile.count({ where });

  return NextResponse.json({ total, categories: categoryFacets, types: typeFacets });
}