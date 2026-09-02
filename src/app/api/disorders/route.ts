import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const disorders = await prisma.disorder.findMany({
    orderBy: { sortOrder: "asc" },
  });

  // Group by cluster
  const grouped = {
    A: disorders.filter((d) => d.cluster === "A"),
    B: disorders.filter((d) => d.cluster === "B"),
    C: disorders.filter((d) => d.cluster === "C"),
    none: disorders.filter((d) => d.cluster === "none"),
  };

  return NextResponse.json({ disorders, grouped });
}