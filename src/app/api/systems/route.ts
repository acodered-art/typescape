import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { TYPING_SYSTEMS } from "@/lib/typing-systems";

export async function GET() {
  const systems = await prisma.typingSystem.findMany({
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json(
    systems.length > 0 ? systems : TYPING_SYSTEMS.map((s) => ({
      ...s,
      id: "",
      createdAt: new Date(),
    }))
  );
}