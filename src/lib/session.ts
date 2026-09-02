import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";

export async function auth(): Promise<{ user: { id: string; username?: string; role?: string } } | null> {
  // Try NextAuth session first (OAuth logins)
  const nextAuthSession = await getServerSession(authOptions);
  if (nextAuthSession?.user) {
    return nextAuthSession as { user: { id: string; username?: string; role?: string } };
  }

  // Fallback to custom session_token cookie (email/password logins)
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session_token")?.value;
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