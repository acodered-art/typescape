import { guardV1, okWithLimit, fail } from "@/lib/api-v1";
import { calcCompatibility } from "@/lib/compatibility";
import { TYPING_SYSTEMS } from "@/lib/typing-systems";

/**
 * POST /api/v1/compatibility — two readings, one report.
 *
 * Body: { a: {system,type}, b: {system,type} }. The scoring is the same pure
 * function the web page uses, so both clients agree.
 */
const SYSTEM_NAMES: Record<string, string> = Object.fromEntries(
  TYPING_SYSTEMS.map((s) => [s.slug, s.name.replace(/\s*\(.*\)\s*$/, "")])
);

function read(input: unknown) {
  const o = (input ?? {}) as { system?: unknown; type?: unknown };
  return {
    system: typeof o.system === "string" ? o.system.trim().toLowerCase() : "",
    type: typeof o.type === "string" ? o.type.trim() : "",
  };
}

export async function POST(req: Request) {
  const guard = await guardV1(req);
  if (guard.response) return guard.response;

  let body: { a?: unknown; b?: unknown };
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON", 400);
  }

  const a = read(body.a);
  const b = read(body.b);
  if (!a.system || !a.type || !b.system || !b.type) {
    return fail("Both readings need a system and a type", 400);
  }
  const known = new Set(TYPING_SYSTEMS.map((s) => s.slug));
  if (!known.has(a.system) || !known.has(b.system)) return fail("Unknown typing system", 400);

  return okWithLimit(guard.auth, {
    a: { ...a, label: `${SYSTEM_NAMES[a.system] ?? a.system} ${a.type}` },
    b: { ...b, label: `${SYSTEM_NAMES[b.system] ?? b.system} ${b.type}` },
    ...calcCompatibility(a, b, SYSTEM_NAMES),
  });
}
