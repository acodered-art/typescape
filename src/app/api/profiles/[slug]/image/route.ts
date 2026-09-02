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

  // URL validation — HTTPS only, block internal addresses
  if (!imageUrl.startsWith("https://")) {
    return NextResponse.json({ error: "Image URL must use HTTPS" }, { status: 400 });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(imageUrl);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  const hostname = parsedUrl.hostname.toLowerCase();
  const blocked = [
    "127.0.0.1", "localhost", "0.0.0.0", "::1",
    "169.254.169.254",  // AWS metadata
    "metadata.google.internal",  // GCP metadata
  ];
  const isInternal = blocked.includes(hostname) ||
    hostname.startsWith("10.") ||
    hostname.startsWith("192.168.") ||
    hostname.startsWith("172.16.") || hostname.startsWith("172.17.") || hostname.startsWith("172.18.") ||
    hostname.startsWith("172.19.") || hostname.startsWith("172.20.") ||
    hostname.startsWith("172.21.") || hostname.startsWith("172.22.") ||
    hostname.startsWith("172.23.") || hostname.startsWith("172.24.") ||
    hostname.startsWith("172.25.") || hostname.startsWith("172.26.") ||
    hostname.startsWith("172.27.") || hostname.startsWith("172.28.") ||
    hostname.startsWith("172.29.") || hostname.startsWith("172.30.") ||
    hostname.startsWith("172.31.") ||
    hostname.endsWith(".local") || hostname.endsWith(".internal");
  if (isInternal) {
    return NextResponse.json({ error: "Internal addresses not allowed" }, { status: 400 });
  }

  const profile = await prisma.profile.findUnique({
    where: { slug },
    select: { id: true, createdBy: true },
  });

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // Only the profile creator or an admin can change the image
  if (profile.createdBy !== session.user.id && session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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