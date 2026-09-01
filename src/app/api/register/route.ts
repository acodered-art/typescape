import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  const body = await req.json();
  const { username, email, password } = body;

  const errors: string[] = [];
  if (!username || typeof username !== "string" || username.length < 2 || username.length > 30) {
    errors.push("Username must be 2-30 characters");
  }
  if (!email || typeof email !== "string" || !email.includes("@")) {
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