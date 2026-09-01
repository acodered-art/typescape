import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export async function POST(req: Request) {
  const body = await req.json();
  const { email, password } = body;

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: { id: true, username: true, email: true, passwordHash: true, role: true },
  });

  if (!user || !user.passwordHash) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const token = crypto.randomBytes(32).toString("hex");
  await prisma.session.create({
    data: { sessionToken: token, userId: user.id, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
  });

  const response = NextResponse.json({ user: { id: user.id, username: user.username, email: user.email, role: user.role } });
  response.cookies.set("session_token", token, { httpOnly: true, secure: false, sameSite: "lax", maxAge: 7 * 24 * 60 * 60, path: "/" });
  response.cookies.set("user", JSON.stringify({ username: user.username, role: user.role }), { httpOnly: false, secure: false, sameSite: "lax", maxAge: 7 * 24 * 60 * 60, path: "/" });

  return response;
}