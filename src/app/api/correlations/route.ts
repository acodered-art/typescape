import { NextResponse } from "next/server";
import { getCorrelations } from "@/lib/correlations";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const system = searchParams.get("system");
  const type = searchParams.get("type");

  if (!system || !type) {
    return NextResponse.json({ error: "system and type query params required" }, { status: 400 });
  }

  const correlations = getCorrelations(system, type);
  return NextResponse.json(correlations);
}