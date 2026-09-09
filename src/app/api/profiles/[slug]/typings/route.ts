import { NextResponse } from "next/server";
import { guardCsrf } from "@/lib/csrf";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/session";
import { guardCanPost } from "@/lib/post-guard";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/client-ip";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const csrfError = await guardCsrf(req);
  if (csrfError) return csrfError;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // A ban or timeout must actually stop writes.
  const blocked = await guardCanPost(session.user.id);
  if (blocked?.response) return blocked.response;

  const ip = clientIp(req);
  const rl = await rateLimit(`typing:${ip}`, 20, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many typings" }, { status: 429 });
  }

  const { slug } = await params;
  const body = await req.json();
  const { typingSystemId, typeValue, details, evidenceUrls } = body;

  if (!typingSystemId || !typeValue) {
    return NextResponse.json({ error: "typingSystemId and typeValue required" }, { status: 400 });
  }

  // Get profile by slug
  const profile = await prisma.profile.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // Check if user already submitted this typing
  const existing = await prisma.profileTyping.findFirst({
    where: {
      profileId: profile.id,
      typingSystemId,
      typeValue,
      createdBy: session.user.id,
    },
  });

  if (existing) {
    return NextResponse.json({ error: "You already submitted this typing" }, { status: 409 });
  }

  const typing = await prisma.profileTyping.create({
    data: {
      profileId: profile.id,
      typingSystemId,
      typeValue,
      details: details || undefined,
      evidenceUrls: evidenceUrls || [],
      createdBy: session.user.id,
    },
  });

  return NextResponse.json(typing, { status: 201 });
}