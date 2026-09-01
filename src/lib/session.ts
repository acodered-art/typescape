import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function auth(): Promise<{ user: { id: string; username?: string; role?: string } } | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return session as { user: { id: string; username?: string; role?: string } };
}