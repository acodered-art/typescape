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

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* installability is a bonus; never break the page over it */
      });
    };

    // Register after load so it never competes with first paint.
    if (document.readyState === "complete") register();
    else {
      window.addEventListener("load", register, { once: true });
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}
