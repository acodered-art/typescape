import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/session";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string; postId: string }> }
) {
  const { slug, postId } = await params;

  const group = await prisma.group.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  const post = await prisma.groupPost.findUnique({
    where: { id: postId },
    include: {
      user: { select: { id: true, username: true, avatarUrl: true, reputation: true } },
      replies: {
        include: {
          user: { select: { id: true, username: true, avatarUrl: true, reputation: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!post || post.groupId !== group.id) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  return NextResponse.json(post);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ slug: string; postId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug, postId } = await params;

  const group = await prisma.group.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  const post = await prisma.groupPost.findUnique({
    where: { id: postId },
    select: { id: true, userId: true },
  });

  if (!post || post.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.groupPost.delete({ where: { id: post.id } });

  await prisma.group.update({
    where: { id: group.id },
    data: { postCount: { decrement: 1 } },
  });

  return NextResponse.json({ deleted: true });
}