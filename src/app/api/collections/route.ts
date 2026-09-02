import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/session";
import { generateSlug } from "@/lib/utils";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get("username");
  const limit = Math.min(Number(searchParams.get("limit")) || 20, 50);

  const where: Record<string, unknown> = { isPublic: true };

  if (username) {
    const user = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });
    if (user) where.userId = user.id;
  }

  const collections = await prisma.collection.findMany({
    where,
    include: {
      user: { select: { username: true } },
      _count: { select: { items: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: limit,
  });

  return NextResponse.json(collections);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = req.headers.get("x-forwarded-for") || "unknown";
  const rl = rateLimit(`collections:${ip}`, 5, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many collections" }, { status: 429 });
  }

  const body = await req.json();
  const { name, description, isPublic } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }

  if (name.length > 100) {
    return NextResponse.json({ error: "Name too long (max 100 chars)" }, { status: 400 });
  }

  // Generate unique slug
  let slug = generateSlug(name);
  let attempts = 0;
  while (attempts < 10) {
    const existing = await prisma.collection.findUnique({ where: { slug } });
    if (!existing) break;
    attempts++;
    slug = generateSlug(name, `${Date.now()}-${attempts}`);
  }

  const collection = await prisma.collection.create({
    data: {
      name: name.trim(),
      slug,
      description: description?.trim() || null,
      userId: session.user.id,
      isPublic: isPublic !== false,
    },
  });

  return NextResponse.json(collection, { status: 201 });
}