import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const pending = await prisma.profile.findMany({
    where: { imageModeration: "pending" },
    select: {
      id: true,
      name: true,
      slug: true,
      imageUrl: true,
      imageUploadedBy: true,
      imageModeration: true,
      createdAt: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(pending);
}

export async function PATCH(req: Request) {
  const body = await req.json();
  const { profileId, action } = body; // action: "approve" or "reject"

  if (!profileId || !["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "profileId and action (approve/reject) required" }, { status: 400 });
  }

  await prisma.profile.update({
    where: { id: profileId },
    data: {
      imageModeration: action === "approve" ? "approved" : "rejected",
      ...(action === "reject" ? { imageUrl: null } : {}),
    },
  });

  return NextResponse.json({ success: true });
}