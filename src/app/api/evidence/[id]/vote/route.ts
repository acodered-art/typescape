import { NextResponse } from "next/server";
import { guardCsrf } from "@/lib/csrf";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/client-ip";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrfError = await guardCsrf(req);
  if (csrfError) return csrfError;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = clientIp(req);
  const rl = await rateLimit(`evidence-vote:${ip}`, 30, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many votes" }, { status: 429 });
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

  // Cannot vote on your own evidence
  if (evidence.userId === session.user.id) {
    return NextResponse.json({ error: "Cannot vote on your own evidence" }, { status: 400 });
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