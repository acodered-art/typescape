/**
 * Base URL for server-side (SSR) fetches back into this same app.
 *
 * Server components must never call the public URL — the request would go out
 * to Cloudflare and come back in, adding a round trip and risking a tunnel
 * loop. They talk to the local listener instead.
 *
 * `INTERNAL_API_URL` overrides it (useful for a second instance on another
 * port, or when the app is behind a different local address). The default is
 * the port the production server is started on.
 */
export const INTERNAL_API_URL =
  process.env.INTERNAL_API_URL || "http://localhost:3002";

/** Absolute internal URL for an API path, e.g. `apiUrl("/api/stats")`. */
export function apiUrl(path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${INTERNAL_API_URL}${clean}`;
}
