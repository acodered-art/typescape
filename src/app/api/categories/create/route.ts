import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/session";
import { generateSlug } from "@/lib/utils";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, parentSlug } = body;

  if (!name || typeof name !== "string" || name.trim().length < 2) {
    return NextResponse.json({ error: "Name must be at least 2 characters" }, { status: 400 });
  }

  let parentId: string | undefined;

  if (parentSlug) {
    const parent = await prisma.category.findUnique({ where: { slug: parentSlug }, select: { id: true } });
    if (!parent) return NextResponse.json({ error: "Parent category not found" }, { status: 404 });
    parentId = parent.id;
  }

  // Check for duplicate
  const slug = parentSlug
    ? generateSlug(`${parentSlug}-${name}`)
    : generateSlug(name);

  const existing = await prisma.category.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json({ error: "Category already exists" }, { status: 409 });
  }

  const category = await prisma.category.create({
    data: {
      name: name.trim(),
      slug,
      parentId: parentId || null,
    },
  });

  return NextResponse.json(category, { status: 201 });
}