/**
 * Resolve the caller's IP in a way that cannot be spoofed by the client.
 *
 * `x-forwarded-for` is a client-writable header. Trusting it lets anyone bypass
 * every rate limit by sending a fresh value, and lets them forge the SSR
 * self-fetch bypass. The only header we trust is the one our own edge sets.
 *
 * Trust order:
 *   1. `cf-connecting-ip` — set by Cloudflare and overwritten on every request.
 *      Only honoured when `TRUST_CF_HEADERS` is enabled, because a direct
 *      request to the origin (port 3002 on the LAN) would otherwise be able to
 *      forge it.
 *   2. `x-real-ip` — set by the reverse proxy in front of Next.js, same gate.
 *   3. The socket address. In the App Router this is not exposed, so we fall
 *      back to a constant bucket. That is deliberately coarse: an unattributable
 *      caller shares one rate-limit bucket instead of getting a free pass.
 *
 * Set `TRUST_CF_HEADERS=true` in the environment only when the origin is not
 * directly reachable (Cloudflare tunnel / authenticated proxy in front).
 */

const TRUST_PROXY_HEADERS =
  process.env.TRUST_CF_HEADERS === "true" ||
  process.env.TRUST_PROXY_HEADERS === "true";

/** Addresses considered local: SSR self-fetches, health checks, tunnel egress. */
export function isInternalIp(ip: string): boolean {
  if (!ip) return true;
  if (ip === "127.0.0.1" || ip === "::1" || ip === "unknown") return true;
  if (ip.startsWith("172.")) return true; // docker bridge networks
  if (ip.startsWith("10.")) return true; // private range
  if (/^192\.168\./.test(ip)) return true; // private range
  if (ip.startsWith("::ffff:127.")) return true;
  return false;
}

export function clientIp(req: Request): string {
  if (TRUST_PROXY_HEADERS) {
    const cf = req.headers.get("cf-connecting-ip");
    if (cf) return cf.trim();

    const real = req.headers.get("x-real-ip");
    if (real) return real.trim();
  }

  // Untrusted or absent: do NOT read x-forwarded-for. Everyone shares a bucket.
  return "unknown";
}

/** True when the request looks like an internal (SSR / proxy / health) call. */
export function isInternalRequest(req: Request): boolean {
  return isInternalIp(clientIp(req));
}
