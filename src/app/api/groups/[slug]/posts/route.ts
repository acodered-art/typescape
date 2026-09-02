import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit")) || 20, 50);

  const group = await prisma.group.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  const posts = await prisma.groupPost.findMany({
    where: { groupId: group.id },
    select: {
      id: true,
      title: true,
      body: true,
      pinOrder: true,
      replyCount: true,
      createdAt: true,
      user: { select: { id: true, username: true, avatarUrl: true, reputation: true } },
      replies: {
        select: { id: true },
        take: 1, // just count via _count
      },
      _count: { select: { replies: true } },
    },
    orderBy: [{ pinOrder: "desc" }, { createdAt: "desc" }],
    take: limit,
  });

  return NextResponse.json(posts);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = req.headers.get("x-forwarded-for") || "unknown";
  const rl = rateLimit(`group-post:${ip}`, 5, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many posts" }, { status: 429 });
  }

  const { slug } = await params;
  const body = await req.json();
  const { title, text } = body;

  if (!title || typeof title !== "string" || title.trim().length < 2) {
    return NextResponse.json({ error: "Title must be at least 2 characters" }, { status: 400 });
  }

  if (!text || typeof text !== "string" || text.trim().length < 2) {
    return NextResponse.json({ error: "Post body required" }, { status: 400 });
  }

  if (title.length > 200) {
    return NextResponse.json({ error: "Title too long (max 200 chars)" }, { status: 400 });
  }

  if (text.length > 10000) {
    return NextResponse.json({ error: "Post too long (max 10000 chars)" }, { status: 400 });
  }

  const group = await prisma.group.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  // Check membership
  const member = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: group.id, userId: session.user.id } },
  });

  if (!member) {
    return NextResponse.json({ error: "You must join the group to post" }, { status: 403 });
  }

  const post = await prisma.groupPost.create({
    data: {
      groupId: group.id,
      userId: session.user.id,
      title: title.trim(),
      body: text.trim(),
    },
    include: {
      user: { select: { id: true, username: true, avatarUrl: true, reputation: true } },
    },
  });

  await prisma.group.update({
    where: { id: group.id },
    data: { postCount: { increment: 1 } },
  });

  return NextResponse.json(post, { status: 201 });
}