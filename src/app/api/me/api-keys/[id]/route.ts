import { NextResponse } from "next/server";
import { guardCsrf } from "@/lib/csrf";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/session";

/**
 * PATCH /api/me/api-keys/[id] — revoke or rename one of your own keys.
 *
 * Body: { revoked?: boolean, name?: string }
 *
 * Revocation is soft (a timestamp), so usage history survives and the hash stays
 * unique — a revoked key can never be re-issued to someone else.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrfError = await guardCsrf(req);
  if (csrfError) return csrfError;

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const key = await prisma.apiKey.findUnique({
    where: { id },
    select: { id: true, userId: true },
  });
  if (!key || key.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: { revoked?: unknown; name?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data: { revokedAt?: Date | null; name?: string } = {};
  if (body.revoked === true) data.revokedAt = new Date();
  if (body.revoked === false) data.revokedAt = null;
  if (typeof body.name === "string" && body.name.trim()) {
    data.name = body.name.trim().slice(0, 60);
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const updated = await prisma.apiKey.update({
    where: { id },
    data,
    select: { id: true, name: true, prefix: true, scopes: true, revokedAt: true },
  });

  return NextResponse.json({ apiKey: updated });
}
