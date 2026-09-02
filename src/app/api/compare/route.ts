import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type1 = searchParams.get("type1");
  const system1 = searchParams.get("system1") || "mbti";
  const type2 = searchParams.get("type2");
  const system2 = searchParams.get("system2") || "mbti";

  if (!type1 || !type2) {
    return NextResponse.json({ error: "type1 and type2 required" }, { status: 400 });
  }

  // Count profiles that have both typings
  const profilesWithBoth = await prisma.profile.findMany({
    where: {
      AND: [
        { typings: { some: { typingSystem: { slug: system1 }, typeValue: type1 } } },
        { typings: { some: { typingSystem: { slug: system2 }, typeValue: type2 } } },
      ],
    },
    include: {
      typings: {
        where: { OR: [{ typeValue: type1 }, { typeValue: type2 }] },
        include: { typingSystem: { select: { slug: true } } },
      },
    },
    take: 10,
  });

  // Get type descriptions
  const type1Count = await prisma.profileTyping.count({
    where: { typingSystem: { slug: system1 }, typeValue: type1 },
  });
  const type2Count = await prisma.profileTyping.count({
    where: { typingSystem: { slug: system2 }, typeValue: type2 },
  });

  // Get well-known characters for each type
  const type1Profiles = await prisma.profile.findMany({
    where: { typings: { some: { typingSystem: { slug: system1 }, typeValue: type1 } } },
    orderBy: { viewCount: "desc" },
    take: 5,
    select: { name: true, slug: true },
  });
  const type2Profiles = await prisma.profile.findMany({
    where: { typings: { some: { typingSystem: { slug: system2 }, typeValue: type2 } } },
    orderBy: { viewCount: "desc" },
    take: 5,
    select: { name: true, slug: true },
  });

  return NextResponse.json({
    type1: { type: type1, system: system1, count: type1Count, examples: type1Profiles },
    type2: { type: type2, system: system2, count: type2Count, examples: type2Profiles },
    sharedProfiles: profilesWithBoth.length,
    commonProfiles: profilesWithBoth.filter((p) => {
      const hasT1 = p.typings.some((t) => t.typeValue === type1 && t.typingSystem.slug === system1);
      const hasT2 = p.typings.some((t) => t.typeValue === type2 && t.typingSystem.slug === system2);
      return hasT1 && hasT2;
    }).map((p) => ({ name: p.name, slug: p.slug })),
  });
}