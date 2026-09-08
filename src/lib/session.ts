import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cookies, headers } from "next/headers";

/**
 * Resolve the acting user from, in order:
 *   1. a NextAuth session (OAuth logins in a browser)
 *   2. an `Authorization: Bearer <sessionToken>` header (native/mobile clients)
 *   3. the `session_token` cookie (email/password logins in a browser)
 *
 * The bearer and cookie paths resolve the *same* `Session` row, so a token
 * issued to a phone and a cookie issued to a browser carry identical authority.
 * Bearer is checked first so a native client that sends both is unambiguous.
 */
export async function auth(): Promise<{ user: { id: string; username?: string; role?: string } } | null> {
  // Try NextAuth session first (OAuth logins)
  const nextAuthSession = await getServerSession(authOptions);
  if (nextAuthSession?.user) {
    return nextAuthSession as { user: { id: string; username?: string; role?: string } };
  }

  try {
    const headerList = await headers();
    const bearer = bearerToken(headerList);
    const cookieStore = await cookies();
    const token = bearer ?? cookieStore.get("session_token")?.value ?? null;
    if (!token) return null;

    const session = await prisma.session.findFirst({
      where: {
        sessionToken: token,
        expiresAt: { gt: new Date() },
      },
      include: {
        user: { select: { id: true, username: true, role: true } },
      },
    });

    if (!session) return null;

    return {
      user: {
        id: session.user.id,
        username: session.user.username,
        role: session.user.role,
      },
    };
  } catch {
    return null;
  }
}

/** Extract a bearer token from an incoming header set, or null. */
export function bearerToken(headerList: Headers): string | null {
  const header = headerList.get("authorization");
  if (!header) return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}
