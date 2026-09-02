import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  // Only apply to HTML responses
  if (!req.nextUrl.pathname.startsWith("/_next") && !req.nextUrl.pathname.startsWith("/api")) {
    const response = NextResponse.next();

    // Security headers — CSP
    // Next.js App Router uses inline scripts for RSC hydration, so
    // script-src requires 'unsafe-inline'. 'unsafe-eval' is NOT needed.
    // TODO: replace 'unsafe-inline' with per-request nonces for stricter CSP
    response.headers.set(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' https:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
    );
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("X-XSS-Protection", "1; mode=block");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    response.headers.set("X-DNS-Prefetch-Control", "off");

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico).*)",
};