import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";

// Strip HTML tags to prevent XSS
function sanitize(text: string): string {
  return text.replace(/<[^>]*>/g, "").replace(/[&<>"']/g, (c) => {
    const m: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#x27;" };
    return m[c] || c;
  });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const profile = await prisma.profile.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const comments = await prisma.comment.findMany({
    where: {
      profileId: profile.id,
      parentId: null, // only top-level; replies nested client-side
      isDeleted: false,
    },
    include: {
      user: { select: { username: true, avatarUrl: true, reputation: true } },
      replies: {
        where: { isDeleted: false },
        include: {
          user: { select: { username: true, avatarUrl: true, reputation: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(comments);
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
  const rl = rateLimit(`comment:${ip}`, 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many comments. Slow down." }, { status: 429 });
  }

  const { slug } = await params;
  const body = await req.json();
  const { body: text, parentId } = body;

  if (!text || typeof text !== "string" || text.trim().length === 0) {
    return NextResponse.json({ error: "Comment body required" }, { status: 400 });
  }

  if (text.length > 5000) {
    return NextResponse.json({ error: "Comment too long (max 5000 chars)" }, { status: 400 });
  }

  const profile = await prisma.profile.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // If replying, verify parent exists and belongs to same profile
  if (parentId) {
    const parent = await prisma.comment.findUnique({
      where: { id: parentId },
      select: { profileId: true, id: true },
    });
    if (!parent || parent.profileId !== profile.id) {
      return NextResponse.json({ error: "Parent comment not found" }, { status: 404 });
    }
  }

  const comment = await prisma.comment.create({
    data: {
      profileId: profile.id,
      parentId: parentId || null,
      userId: session.user.id,
      body: sanitize(text.trim()),
    },
    include: {
      user: { select: { username: true, avatarUrl: true, reputation: true } },
    },
  });

  return NextResponse.json(comment, { status: 201 });
}