import { useSyncExternalStore } from "react";

/* The signed-in reader, read from the non-httpOnly `user` cookie the login route sets ({ username }).
   An external store, not effect state, so the repo's set-state-in-effect rule stays quiet and the
   server render matches (it renders as signed out). */

function subscribe(onChange: () => void) {
  window.addEventListener("focus", onChange);
  return () => window.removeEventListener("focus", onChange);
}

function readHandle(): string {
  if (typeof document === "undefined") return "";
  const m = document.cookie.match(/(?:^|; )user=([^;]*)/);
  if (!m) return "";
  try {
    const parsed = JSON.parse(decodeURIComponent(m[1])) as { username?: string };
    return parsed.username ?? "";
  } catch {
    return "";
  }
}

/** The signed-in reader's handle, or "" when signed out (and always "" during server rendering). */
export function useReaderHandle(): string {
  return useSyncExternalStore(subscribe, readHandle, () => "");
}
