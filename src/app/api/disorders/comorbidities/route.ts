import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const comorbidities = await prisma.disorderComorbidity.findMany({
    include: {
      disorderA: { select: { id: true, name: true, slug: true, cluster: true } },
      disorderB: { select: { id: true, name: true, slug: true, cluster: true } },
    },
    orderBy: { strength: "desc" },
  });

  return NextResponse.json(comorbidities);
}