import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  // Redirect HTTP to HTTPS in production (Cloudflare sends x-forwarded-proto).
  // Skip redirect for localhost/internal requests so local dev and health checks work.
  const hostname = req.nextUrl.hostname;
  const isLocal = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname === "0.0.0.0";
  if (!isLocal && process.env.NODE_ENV === "production" && req.headers.get("x-forwarded-proto") === "http") {
    const url = new URL(req.url);
    url.protocol = "https:";
    return NextResponse.redirect(url, 301);
  }

  // Only apply to HTML responses. Static PWA assets are excluded deliberately:
  // a Content-Security-Policy on /sw.js can stop the browser installing the app,
  // and X-Frame-Options on a manifest is meaningless.
  const PWA_ASSETS = ["/sw.js", "/manifest.webmanifest", "/embed.js"];
  const isHtmlDocument =
    !req.nextUrl.pathname.startsWith("/_next") &&
    !req.nextUrl.pathname.startsWith("/api") &&
    !PWA_ASSETS.includes(req.nextUrl.pathname) &&
    !req.nextUrl.pathname.startsWith("/icons/");

  if (isHtmlDocument) {
    const response = NextResponse.next();

    // Security headers — CSP
    // Next.js App Router uses inline scripts for RSC hydration, so
    // script-src requires 'unsafe-inline'. 'unsafe-eval' is NOT needed.
    // TODO: replace 'unsafe-inline' with per-request nonces for stricter CSP
    response.headers.set(
      "Content-Security-Policy",
      // worker-src: a service worker without it falls back to default-src, and
      // some browsers then refuse to register the worker at all — which makes
      // the app uninstallable. frame-src is needed for nothing today but keeps
      // the policy explicit.
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; font-src 'self' data:; connect-src 'self' https:; worker-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
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