import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/session";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const collection = await prisma.collection.findUnique({
    where: { slug },
    include: {
      user: { select: { username: true, avatarUrl: true, reputation: true } },
      items: {
        include: {
          profile: {
            select: {
              id: true,
              name: true,
              slug: true,
              imageUrl: true,
              description: true,
              category: { select: { name: true, slug: true } },
              typings: {
                select: {
                  typeValue: true,
                  confidence: true,
                  typingSystem: { select: { name: true, slug: true } },
                },
                take: 3,
              },
            },
          },
          adder: { select: { username: true } },
        },
        orderBy: { sortOrder: "asc" },
      },
      _count: { select: { items: true } },
    },
  });

  if (!collection) {
    return NextResponse.json({ error: "Collection not found" }, { status: 404 });
  }

  // Private collections are only visible to the owner or admin
  if (!collection.isPublic) {
    const session = await auth();
    if (!session?.user || (collection.userId !== session.user.id && session.user.role !== "admin")) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 });
    }
  }

  return NextResponse.json(collection);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;

  const collection = await prisma.collection.findUnique({
    where: { slug },
    select: { id: true, userId: true },
  });

  if (!collection) {
    return NextResponse.json({ error: "Collection not found" }, { status: 404 });
  }

  if (collection.userId !== session.user.id && session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.collection.delete({ where: { id: collection.id } });

  return NextResponse.json({ deleted: true });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;
  const body = await req.json();

  const collection = await prisma.collection.findUnique({
    where: { slug },
    select: { id: true, userId: true },
  });

  if (!collection) {
    return NextResponse.json({ error: "Collection not found" }, { status: 404 });
  }

  if (collection.userId !== session.user.id && session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updated = await prisma.collection.update({
    where: { id: collection.id },
    data: {
      ...(body.name ? { name: body.name } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.isPublic !== undefined ? { isPublic: body.isPublic } : {}),
    },
  });

  return NextResponse.json(updated);
}