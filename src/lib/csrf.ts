import crypto from "crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const CSRF_COOKIE = "csrf_token";
const CSRF_HEADER = "x-csrf-token";

/** Methods that mutate state and therefore require a CSRF token. */
const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Read the double-submit token from the request without touching `next/headers`.
 * Exported so routes that already parse the cookie store can reuse it.
 */
export function readCsrfCookieRaw(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === CSRF_COOKIE) return rest.join("=") || null;
  }
  return null;
}

export async function setCsrfCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(CSRF_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 3600,
    path: "/",
  });
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let match = 0;
  for (let i = 0; i < a.length; i++) {
    match |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return match === 0;
}

export async function validateCsrf(req: Request): Promise<boolean> {
  const headerToken = req.headers.get(CSRF_HEADER);
  if (!headerToken) return false;

  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(CSRF_COOKIE)?.value;
  if (!cookieToken) return false;

  return constantTimeEqual(headerToken, cookieToken);
}

/**
 * Guard for mutating API routes. Returns a response when the request must be
 * rejected, or `null` when it may proceed.
 *
 * Safe methods are allowed through untouched, so this can be called
 * unconditionally at the top of every handler.
 *
 *   const csrfError = await guardCsrf(req);
 *   if (csrfError) return csrfError;
 *
 * Requests without a session cookie are still rejected: the token is the only
 * thing preventing a cross-site POST, and an unauthenticated mutation has no
 * legitimate caller from another origin.
 */
export async function guardCsrf(req: Request): Promise<NextResponse | null> {
  if (!UNSAFE_METHODS.has(req.method.toUpperCase())) return null;
  if (await validateCsrf(req)) return null;
  return NextResponse.json({ error: "Invalid or missing CSRF token" }, { status: 403 });
}
