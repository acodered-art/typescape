import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { rateLimit } from "@/lib/rate-limit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-zA-Z0-9_-]+$/;

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  const rl = rateLimit(`register:${ip}`, 3, 60_000); // 3 registrations per minute per IP
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }

  const body = await req.json();
  const { username, email, password } = body;

  const errors: string[] = [];
  if (!username || typeof username !== "string" || username.length < 2 || username.length > 30) {
    errors.push("Username must be 2-30 characters");
  } else if (!USERNAME_RE.test(username)) {
    errors.push("Username can only contain letters, numbers, underscores, and hyphens");
  }
  if (!email || typeof email !== "string" || !EMAIL_RE.test(email)) {
    errors.push("Valid email required");
  }
  if (!password || typeof password !== "string" || password.length < 6) {
    errors.push("Password must be at least 6 characters");
  }
  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join("; ") }, { status: 400 });
  }

  const existing = await prisma.user.findFirst({
    where: { OR: [{ username: username.trim() }, { email: email.trim().toLowerCase() }] },
    select: { username: true, email: true },
  });

  if (existing) {
    const field = existing.username === username.trim() ? "Username" : "Email";
    return NextResponse.json({ error: `${field} already taken` }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { username: username.trim(), email: email.trim().toLowerCase(), passwordHash },
    select: { id: true, username: true, email: true, createdAt: true },
  });

  return NextResponse.json({ user, message: "Account created. Sign in to continue." }, { status: 201 });
}