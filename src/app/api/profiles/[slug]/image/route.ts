import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = req.headers.get("x-forwarded-for") || "unknown";
  const rl = rateLimit(`image:${ip}`, 5, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many image uploads" }, { status: 429 });
  }

  const { slug } = await params;
  const body = await req.json();
  const { imageUrl } = body;

  if (!imageUrl || typeof imageUrl !== "string") {
    return NextResponse.json({ error: "imageUrl required" }, { status: 400 });
  }

  // Basic URL validation
  if (!imageUrl.startsWith("https://") && !imageUrl.startsWith("http://")) {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  const profile = await prisma.profile.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  await prisma.profile.update({
    where: { id: profile.id },
    data: {
      imageUrl,
      imageModeration: "pending",
      imageUploadedBy: session.user.id,
    },
  });

  return NextResponse.json({ message: "Image submitted for moderation" });
}