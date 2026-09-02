import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/session";
import { generateSlug } from "@/lib/utils";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const q = searchParams.get("q") || "";
  const limit = Math.min(Number(searchParams.get("limit")) || 30, 50);

  const where: Record<string, unknown> = { isPublic: true };

  if (category) {
    where.category = category;
  }

  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }

  const groups = await prisma.group.findMany({
    where,
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      icon: true,
      category: true,
      memberCount: true,
      postCount: true,
      createdAt: true,
      creator: { select: { username: true } },
    },
    orderBy: [{ memberCount: "desc" }, { postCount: "desc" }],
    take: limit,
  });

  return NextResponse.json(groups);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = req.headers.get("x-forwarded-for") || "unknown";
  const rl = rateLimit(`group-create:${ip}`, 3, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many groups" }, { status: 429 });
  }

  const body = await req.json();
  const { name, description, icon, category } = body;

  if (!name || typeof name !== "string" || name.trim().length < 2) {
    return NextResponse.json({ error: "Name must be at least 2 characters" }, { status: 400 });
  }

  if (name.length > 100) {
    return NextResponse.json({ error: "Name too long (max 100 chars)" }, { status: 400 });
  }

  const validCategories = ["fandom", "system", "theory", "help"];
  if (category && !validCategories.includes(category)) {
    return NextResponse.json({ error: `Category must be one of: ${validCategories.join(", ")}` }, { status: 400 });
  }

  // Generate unique slug
  let slug = generateSlug(name);
  let attempts = 0;
  while (attempts < 10) {
    const existing = await prisma.group.findUnique({ where: { slug } });
    if (!existing) break;
    attempts++;
    slug = generateSlug(name, `${Date.now()}-${attempts}`);
  }

  const group = await prisma.group.create({
    data: {
      name: name.trim(),
      slug,
      description: description?.trim() || null,
      icon: icon?.trim() || null,
      category: category || "fandom",
      createdBy: session.user.id,
      memberCount: 1, // creator is first member
    },
  });

  // Auto-join creator as admin
  await prisma.groupMember.create({
    data: { groupId: group.id, userId: session.user.id, role: "admin" },
  });

  return NextResponse.json(group, { status: 201 });
}