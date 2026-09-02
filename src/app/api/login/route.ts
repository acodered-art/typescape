import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  const rl = rateLimit(`login:${ip}`, 5, 60_000); // 5 attempts per minute per IP
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }

  const body = await req.json();
  const { email, password } = body;

  if (!email || typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }
  if (!password || typeof password !== "string") {
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

  const isProd = process.env.NODE_ENV === "production";
  const response = NextResponse.json({ user: { id: user.id, username: user.username, email: user.email, role: user.role } });
  response.cookies.set("session_token", token, { httpOnly: true, secure: isProd, sameSite: "lax", maxAge: 7 * 24 * 60 * 60, path: "/" });
  response.cookies.set("user", JSON.stringify({ username: user.username }), { httpOnly: false, secure: isProd, sameSite: "lax", maxAge: 7 * 24 * 60 * 60, path: "/" });

  return response;
}