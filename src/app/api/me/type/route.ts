import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/session";

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { system, typeValue } = body;

  if (!system || !typeValue) {
    return NextResponse.json({ error: "system and typeValue required" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { ownType: `${system}:${typeValue}` },
  });

  return NextResponse.json({ saved: true });
}