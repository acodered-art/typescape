import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string; postId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = req.headers.get("x-forwarded-for") || "unknown";
  const rl = rateLimit(`group-reply:${ip}`, 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many replies" }, { status: 429 });
  }

  const { slug, postId } = await params;
  const body = await req.json();
  const { text } = body;

  if (!text || typeof text !== "string" || text.trim().length < 1) {
    return NextResponse.json({ error: "Reply body required" }, { status: 400 });
  }

  if (text.length > 5000) {
    return NextResponse.json({ error: "Reply too long (max 5000 chars)" }, { status: 400 });
  }

  const group = await prisma.group.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  const post = await prisma.groupPost.findUnique({
    where: { id: postId },
    select: { id: true, groupId: true },
  });

  if (!post || post.groupId !== group.id) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const reply = await prisma.groupPostReply.create({
    data: {
      postId: post.id,
      userId: session.user.id,
      body: text.trim(),
    },
    include: {
      user: { select: { id: true, username: true, avatarUrl: true, reputation: true } },
    },
  });

  await prisma.groupPost.update({
    where: { id: post.id },
    data: { replyCount: { increment: 1 } },
  });

  return NextResponse.json(reply, { status: 201 });
}