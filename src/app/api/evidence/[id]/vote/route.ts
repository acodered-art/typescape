import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/session";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { voteValue } = body; // 1 or -1

  if (![1, -1].includes(voteValue)) {
    return NextResponse.json({ error: "voteValue must be 1 or -1" }, { status: 400 });
  }

  const evidence = await prisma.evidence.findUnique({ where: { id } });
  if (!evidence) {
    return NextResponse.json({ error: "Evidence not found" }, { status: 404 });
  }

  await prisma.evidence.update({
    where: { id },
    data: { voteCount: { increment: voteValue } },
  });

  const updated = await prisma.evidence.findUnique({
    where: { id },
    select: { voteCount: true },
  });

  return NextResponse.json({ voteCount: updated?.voteCount ?? 0 });
}