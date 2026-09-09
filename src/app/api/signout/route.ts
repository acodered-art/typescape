import { NextResponse } from "next/server";
import { guardCsrf } from "@/lib/csrf";

export async function POST(req: Request) {
  const csrfError = await guardCsrf(req);
  if (csrfError) return csrfError;

  const response = NextResponse.json({ signedOut: true });
  response.cookies.set("session_token", "", { maxAge: 0, path: "/" });
  response.cookies.set("user", "", { maxAge: 0, path: "/" });
  return response;
}