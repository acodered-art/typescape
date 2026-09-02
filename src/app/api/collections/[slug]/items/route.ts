import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/session";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;
  const body = await req.json();
  const { profileSlug, note } = body;

  if (!profileSlug) {
    return NextResponse.json({ error: "profileSlug required" }, { status: 400 });
  }

  const collection = await prisma.collection.findUnique({
    where: { slug },
    select: { id: true, userId: true },
  });

  if (!collection) {
    return NextResponse.json({ error: "Collection not found" }, { status: 404 });
  }

  // Only the collection owner or admin can add items
  if (collection.userId !== session.user.id && session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const profile = await prisma.profile.findUnique({
    where: { slug: profileSlug },
    select: { id: true },
  });

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // Check duplicate
  const existing = await prisma.collectionItem.findUnique({
    where: { collectionId_profileId: { collectionId: collection.id, profileId: profile.id } },
  });

  if (existing) {
    // Remove it (toggle)
    await prisma.collectionItem.delete({ where: { id: existing.id } });
    return NextResponse.json({ removed: true });
  }

  // Get highest sort order
  const lastItem = await prisma.collectionItem.findFirst({
    where: { collectionId: collection.id },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  const item = await prisma.collectionItem.create({
    data: {
      collectionId: collection.id,
      profileId: profile.id,
      addedBy: session.user.id,
      note: note || null,
      sortOrder: (lastItem?.sortOrder ?? -1) + 1,
    },
  });

  return NextResponse.json(item, { status: 201 });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;
  const body = await req.json();
  const { itemId } = body;

  if (!itemId) {
    return NextResponse.json({ error: "itemId required" }, { status: 400 });
  }

  const item = await prisma.collectionItem.findUnique({
    where: { id: itemId },
    include: { collection: { select: { userId: true, slug: true } } },
  });

  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  if (item.collection.userId !== session.user.id && session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.collectionItem.delete({ where: { id: itemId } });

  return NextResponse.json({ deleted: true });
}