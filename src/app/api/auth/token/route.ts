import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/client-ip";
import { checkBodySize } from "@/lib/body-size";
import { auth, bearerToken } from "@/lib/session";
import { headers } from "next/headers";

/**
 * Native/mobile token endpoints.
 *
 * A browser logs in with cookies, but a native client cannot use an httpOnly
 * cookie the same way and has no CSRF token to attach. So it exchanges
 * credentials for a bearer token here and sends `Authorization: Bearer <token>`
 * on every request — the same token the cookie path stores in `Session`, so
 * authority is identical.
 *
 *   POST   /api/auth/token            -> { token, expiresAt, user }
 *   GET    /api/auth/token            -> current identity (validates a token)
 *   DELETE /api/auth/token            -> revoke the presented token
 *
 * CSRF does not apply: there is no ambient credential to forge with, and the
 * endpoint is protected by requiring the password (plus rate limiting).
 */

const SESSION_DAYS = 7;

export async function POST(req: Request) {
  const ip = clientIp(req);
  const rl = await rateLimit(`token:${ip}`, 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }

  const sizeErr = checkBodySize(req);
  if (sizeErr) return NextResponse.json({ error: sizeErr }, { status: 413 });

  let body: { email?: unknown; password?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !email.includes("@") || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, username: true, role: true, passwordHash: true },
  });

  // Same message for unknown user and wrong password so the endpoint cannot be
  // used to enumerate accounts.
  if (!user || !user.passwordHash) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);

  await prisma.session.create({
    data: { sessionToken: token, userId: user.id, expiresAt },
  });

  return NextResponse.json(
    {
      token,
      expiresAt: expiresAt.toISOString(),
      user: { id: user.id, username: user.username, role: user.role },
    },
    { status: 201 }
  );
}

/** Validate the presented bearer token and return the identity it maps to. */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  const token = bearerToken(await headers());
  const record = token
    ? await prisma.session.findUnique({
        where: { sessionToken: token },
        select: { expiresAt: true },
      })
    : null;

  return NextResponse.json({
    user: session.user,
    expiresAt: record?.expiresAt.toISOString() ?? null,
  });
}

/** Revoke the exact token presented, leaving other devices signed in. */
export async function DELETE() {
  const token = bearerToken(await headers());
  if (!token) {
    return NextResponse.json({ error: "No bearer token supplied" }, { status: 400 });
  }

  const deleted = await prisma.session.deleteMany({ where: { sessionToken: token } });
  return NextResponse.json({ revoked: deleted.count });
}
