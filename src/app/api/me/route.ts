import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("session_token")?.value;
  if (!token) return NextResponse.json({ user: null });

  const session = await prisma.session.findFirst({
    where: { sessionToken: token, expiresAt: { gt: new Date() } },
    include: { user: { select: { id: true, username: true, email: true, role: true } } },
  });

  return NextResponse.json({ user: session?.user ?? null });
}