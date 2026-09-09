/* TypeScape service worker: offline shell + installability.
 *
 * Deliberately conservative. It caches the app shell and a fallback page so an
 * installed app opens without a network, but never caches API responses or
 * profile pages — stale typing data would be worse than no data.
 */

const CACHE = "typescape-shell-v1";
const SHELL = ["/", "/search", "/match", "/offline"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .catch(() => {
        /* a missing shell entry must not block install */
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never serve stale data: APIs and RSC payloads always hit the network.
  if (url.pathname.startsWith("/api/") || url.search.includes("_rsc=")) return;

  // Navigations: network first, fall back to the cached shell, then /offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cached = await caches.match(request);
        return cached || (await caches.match("/offline")) || Response.error();
      })
    );
    return;
  }

  // Static assets: cache first, then network.
  if (url.pathname.startsWith("/_next/static") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
            return res;
          })
      )
    );
  }
});
