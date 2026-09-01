import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateSlug } from "@/lib/utils";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const category = searchParams.get("category");
  const system = searchParams.get("system");
  const type = searchParams.get("type");
  // Multi-type: comma-separated list of types (AND semantics) — e.g. ?types=INFP,4
  const typesParam = searchParams.get("types");
  const types = typesParam ? typesParam.split(",").filter(Boolean) : [];
  const sort = searchParams.get("sort") || "views";
  const limit = Math.min(Number(searchParams.get("limit")) || 20, 50);
  const offset = Number(searchParams.get("offset")) || 0;

  const where: Record<string, unknown> = {};

  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { bio: { contains: q, mode: "insensitive" } },
    ];
  }

  if (category) {
    where.category = { slug: category };
  }

  // Single type filter (system-scoped if provided)
  if (type) {
    where.typings = {
      some: {
        typeValue: type,
        ...(system ? { typingSystem: { slug: system } } : {}),
      },
    };
  }

  // Multi-type AND filter: profile must have a typing matching EVERY requested type
  if (types.length > 0) {
    where.AND = types.map((t) => ({
      typings: {
        some: { typeValue: t },
      },
    }));
  }

  // Sorting
  const orderBy: Record<string, unknown>[] = [];
  switch (sort) {
    case "recent":
      orderBy.push({ createdAt: "desc" });
      break;
    case "name":
      orderBy.push({ name: "asc" });
      break;
    case "votes":
      orderBy.push({ viewCount: "desc" }); // fallback to views if no vote aggregate
      break;
    case "typings":
      orderBy.push({ createdAt: "desc" });
      break;
    case "views":
    default:
      orderBy.push({ viewCount: "desc" });
      break;
  }

  const [profiles, total] = await Promise.all([
    prisma.profile.findMany({
      where,
      include: {
        category: { select: { name: true, slug: true } },
        typings: {
          include: {
            typingSystem: { select: { name: true, slug: true } },
          },
          take: 5,
        },
        _count: { select: { typings: true, comments: true } },
      },
      orderBy,
      skip: offset,
      take: limit,
    }),
    prisma.profile.count({ where }),
  ]);

  return NextResponse.json({ profiles, total, limit, offset });
}

export async function POST(req: Request) {
  const { auth } = await import("@/lib/session");
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, categoryId, description, imageUrl, bio, externalIds } = body;

  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }

  // Generate unique slug
  let slug = generateSlug(name);
  let attempts = 0;
  while (attempts < 10) {
    const existing = await prisma.profile.findUnique({ where: { slug }, select: { id: true } });
    if (!existing) break;
    attempts++;
    slug = generateSlug(name, `${Date.now()}-${attempts}`);
  }

  const profile = await prisma.profile.create({
    data: {
      name,
      slug,
      categoryId,
      description,
      imageUrl,
      bio,
      externalIds: externalIds || undefined,
      createdBy: session.user.id,
    },
  });

  return NextResponse.json(profile, { status: 201 });
}