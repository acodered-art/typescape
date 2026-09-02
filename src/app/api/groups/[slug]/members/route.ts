import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/session";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;

  const group = await prisma.group.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  // Check if already a member
  const existing = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: group.id, userId: session.user.id } },
  });

  if (existing) {
    // Leave
    await prisma.groupMember.delete({ where: { id: existing.id } });
    await prisma.group.update({
      where: { id: group.id },
      data: { memberCount: { decrement: 1 } },
    });
    return NextResponse.json({ action: "left", member: false });
  }

  // Join
  await prisma.groupMember.create({
    data: { groupId: group.id, userId: session.user.id, role: "member" },
  });
  await prisma.group.update({
    where: { id: group.id },
    data: { memberCount: { increment: 1 } },
  });

  return NextResponse.json({ action: "joined", member: true }, { status: 201 });
}