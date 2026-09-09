"use client";
import { useEffect } from "react";

/**
 * Registers the service worker so the site is installable and opens offline.
 *
 * Production only: a service worker in `next dev` caches aggressively and makes
 * hot reload confusing, which is not a trade worth making.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    // Register immediately rather than on `load`: the browser only offers the
    // install prompt once a service worker is active and controlling the page,
    // and waiting for load adds a delay in which the prompt will not appear.
    // `register()` is non-blocking, so this does not compete with first paint.
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      /* installability is a bonus; never break the page over it */
    });
  }, []);

  return null;
}
