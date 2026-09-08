import { NextResponse } from "next/server";
import { guardCsrf } from "@/lib/csrf";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/client-ip";
import { generateApiKey } from "@/lib/api-auth";
import { effectivePlanSlug, getPlan } from "@/lib/plans";

/**
 * API key management for the signed-in reader.
 *
 * GET  /api/me/api-keys        list keys (prefixes only, never the secret)
 * POST /api/me/api-keys        mint a key; the plaintext is returned ONCE
 *
 * Revocation is a PATCH on /api/me/api-keys/[id].
 */

const SCOPE_VALUES = new Set(["read", "write", "*"]);

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const keys = await prisma.apiKey.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      name: true,
      prefix: true,
      scopes: true,
      rateLimit: true,
      requestCount: true,
      lastUsedAt: true,
      revokedAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ keys });
}

export async function POST(req: Request) {
  const csrfError = await guardCsrf(req);
  if (csrfError) return csrfError;

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = clientIp(req);
  const rl = await rateLimit(`apikey-create:${ip}`, 5, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many keys created" }, { status: 429 });
  }

  // The plan decides how many keys an account may hold.
  const owner = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      plan: true,
      subscriptions: {
        where: { status: { in: ["active", "past_due"] } },
        orderBy: { currentPeriodEnd: "desc" },
        take: 1,
        select: { planSlug: true, status: true, currentPeriodEnd: true },
      },
    },
  });
  const planSlug = effectivePlanSlug(owner?.subscriptions[0] ?? null, owner?.plan);
  const maxKeys = getPlan(planSlug).maxApiKeys;

  const existing = await prisma.apiKey.count({
    where: { userId: session.user.id, revokedAt: null },
  });
  if (existing >= maxKeys) {
    return NextResponse.json(
      { error: `Your ${planSlug} plan allows ${maxKeys} active keys. Revoke one or upgrade.` },
      { status: 409 }
    );
  }

  let body: { name?: unknown; scopes?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    /* an empty body is fine: defaults apply */
  }

  const name =
    typeof body.name === "string" && body.name.trim().slice(0, 60)
      ? body.name.trim().slice(0, 60)
      : "default";

  const requested = Array.isArray(body.scopes)
    ? body.scopes.filter((s): s is string => typeof s === "string" && SCOPE_VALUES.has(s))
    : [];
  // Nothing broader than read is granted implicitly; write scope needs to be
  // asked for explicitly and is validated against the allowlist above.
  const scopes = requested.length > 0 ? requested : ["read"];

  const { key, hash, prefix } = generateApiKey();

  const created = await prisma.apiKey.create({
    data: {
      userId: session.user.id,
      name,
      keyHash: hash,
      prefix,
      scopes,
    },
    select: { id: true, name: true, prefix: true, scopes: true, createdAt: true },
  });

  return NextResponse.json(
    {
      // Shown exactly once. The server keeps only the hash.
      key,
      warning: "Store this now — it cannot be retrieved again.",
      apiKey: created,
    },
    { status: 201 }
  );
}
