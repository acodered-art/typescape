import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const traits = await prisma.traitDimension.findMany({
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json(traits);
}