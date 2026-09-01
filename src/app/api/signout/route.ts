import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ signedOut: true });
  response.cookies.set("session_token", "", { maxAge: 0, path: "/" });
  response.cookies.set("user", "", { maxAge: 0, path: "/" });
  return response;
}