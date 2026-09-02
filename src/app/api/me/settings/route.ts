import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";

const URL_RE = /^https?:\/\/.+/;

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = req.headers.get("x-forwarded-for") || "unknown";
  const rl = rateLimit(`settings:${ip}`, 5, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await req.json();
  const { bio, avatarUrl } = body;

  const data: Record<string, unknown> = {};

  if (bio !== undefined) {
    if (typeof bio !== "string" || bio.length > 500) {
      return NextResponse.json({ error: "Bio must be under 500 characters" }, { status: 400 });
    }
    data.bio = bio.trim();
  }

  if (avatarUrl !== undefined) {
    if (avatarUrl && (!URL_RE.test(avatarUrl) || avatarUrl.length > 500)) {
      return NextResponse.json({ error: "Invalid avatar URL" }, { status: 400 });
    }
    data.avatarUrl = avatarUrl || null;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data,
    select: { id: true, username: true, bio: true, avatarUrl: true, role: true },
  });

  return NextResponse.json(user);
}