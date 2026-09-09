import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/client-ip";
import { calcCompatibility } from "@/lib/compatibility";
import { TYPING_SYSTEMS } from "@/lib/typing-systems";

/**
 * POST /api/compatibility
 *
 * Body: { a: {system,type}, b: {system,type} }
 *
 * Public and stateless: two readings in, a report out. No account needed, which
 * is the point — this is a shareable "how do we line up?" link.
 */

const SYSTEM_NAMES: Record<string, string> = Object.fromEntries(
  TYPING_SYSTEMS.map((s) => [s.slug, s.name.replace(/\s*\(.*\)\s*$/, "")])
);

interface ReadingBody {
  system?: unknown;
  type?: unknown;
}

function read(input: unknown): { system: string; type: string } {
  const obj = (input ?? {}) as ReadingBody;
  return {
    system: typeof obj.system === "string" ? obj.system.trim().toLowerCase() : "",
    type: typeof obj.type === "string" ? obj.type.trim() : "",
  };
}

export async function POST(req: Request) {
  const ip = clientIp(req);
  const rl = await rateLimit(`compat:${ip}`, 30, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: { a?: unknown; b?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const a = read(body.a);
  const b = read(body.b);

  if (!a.system || !a.type || !b.system || !b.type) {
    return NextResponse.json(
      { error: "Both readings need a system and a type" },
      { status: 400 }
    );
  }

  const known = new Set(TYPING_SYSTEMS.map((s) => s.slug));
  if (!known.has(a.system) || !known.has(b.system)) {
    return NextResponse.json({ error: "Unknown typing system" }, { status: 400 });
  }

  const result = calcCompatibility(a, b, SYSTEM_NAMES);

  return NextResponse.json({
    a: { ...a, label: `${SYSTEM_NAMES[a.system] ?? a.system} ${a.type}` },
    b: { ...b, label: `${SYSTEM_NAMES[b.system] ?? b.system} ${b.type}` },
    ...result,
  });
}
