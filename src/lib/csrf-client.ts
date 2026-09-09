"use client";

const CSRF_COOKIE = "csrf_token";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

let inflight: Promise<string | null> | null = null;

/**
 * Ensure a CSRF token exists and return it.
 *
 * The cookie is httpOnly, so the client cannot read it — it must ask
 * `/api/csrf` for the token and the server sets the paired cookie. Concurrent
 * callers share one request so a burst of mutations does not fire N tokens
 * (each would rotate the cookie and invalidate the others).
 */
export async function ensureCsrfToken(): Promise<string | null> {
  if (readCookie(CSRF_COOKIE)) return readCookie(CSRF_COOKIE);
  if (!inflight) {
    inflight = fetch("/api/csrf", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { csrfToken?: string } | null) => d?.csrfToken ?? null)
      .catch(() => null)
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

/**
 * `fetch` with the CSRF header attached for mutating methods.
 *
 * Use this instead of a bare `fetch` for every POST/PUT/PATCH/DELETE. On a 403
 * caused by a missing/expired token it fetches a fresh token and retries once,
 * so a long-lived tab does not start failing after the 1h cookie expiry.
 */
export async function fetchWithCsrf(
  input: string,
  init: RequestInit = {}
): Promise<Response> {
  const method = (init.method ?? "GET").toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return fetch(input, init);
  }

  const token = await ensureCsrfToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("x-csrf-token", token);

  let res = await fetch(input, { ...init, headers });
  if (res.status === 403) {
    // Token may have expired server-side; force a refresh and retry once.
    inflight = null;
    const fresh = await ensureCsrfToken();
    if (fresh) {
      const retryHeaders = new Headers(init.headers);
      retryHeaders.set("x-csrf-token", fresh);
      res = await fetch(input, { ...init, headers: retryHeaders });
    }
  }
  return res;
}
