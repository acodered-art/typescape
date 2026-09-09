import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/session";

/**
 * The signed-in reader, resolved through the shared `auth()` helper so this
 * works with a cookie (browser), a bearer token (native client), or a NextAuth
 * session. Returns `{ user: null }` rather than 401 when nobody is signed in —
 * the header renders a signed-out state from this response.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ user: null });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      reputation: true,
      bio: true,
      avatarUrl: true,
      plan: true,
    },
  });

  return NextResponse.json({ user: user ?? null });
}
