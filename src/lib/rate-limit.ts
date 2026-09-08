/**
 * Rate limiting that survives restarts and is shared across processes.
 *
 * Uses a fixed-window counter in Redis (INCR + PEXPIRE via a tiny RESP client,
 * so there is no new runtime dependency). If Redis is unreachable the limiter
 * degrades to the in-process Map it replaced: limits become per-process and
 * reset on restart, which is weaker but never open.
 *
 * Keys are namespaced `rl:<bucket>:<id>` so they are easy to inspect:
 *   redis-cli --scan --pattern 'rl:*'
 */

import net from "net";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6381";
const KEY_PREFIX = "rl:";
const FALLBACK_WARN_INTERVAL = 60_000;

type Entry = { count: number; resetAt: number };
const fallbackMap = new Map<string, Entry>();
let lastFallbackWarn = 0;

/** Minimal RESP client: connect per call. Rate limits are low-frequency, and a
 *  persistent pool would need reconnection logic that is not worth it here. */
function redisCommand(args: string[]): Promise<string | null> {
  return new Promise((resolve) => {
    let url: URL;
    try {
      url = new URL(REDIS_URL);
    } catch {
      return resolve(null);
    }
    const port = Number(url.port || 6379);
    const host = url.hostname || "127.0.0.1";
    const password = url.password ? decodeURIComponent(url.password) : null;

    let settled = false;
    const done = (v: string | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.destroy();
      resolve(v);
    };

    const socket = net.connect({ host, port });
    const timer = setTimeout(() => done(null), 1000);

    socket.on("error", () => done(null));
    socket.on("timeout", () => done(null));

    socket.on("connect", () => {
      const parts: string[] = [];
      if (password) parts.push(`AUTH ${password}`);
      parts.push(...args);
      const payload = parts
        .map((p) => {
          const s = String(p);
          return `$${Buffer.byteLength(s)}\r\n${s}\r\n`;
        })
        .join("");
      socket.write(`*${parts.length}\r\n${payload}`);
    });

    let buf = "";
    socket.on("data", (chunk) => {
      buf += chunk.toString("utf8");
      // Wait until we have a complete reply line.
      if (!buf.includes("\r\n")) return;
      const first = buf.split("\r\n")[0];
      if (first.startsWith("-")) return done(null);
      if (first.startsWith(":")) return done(first.slice(1));
      if (first.startsWith("+")) return done(first.slice(1));
      return done(first);
    });
  });
}

function fallbackRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = fallbackMap.get(key);
  if (!entry || now > entry.resetAt) {
    fallbackMap.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }
  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }
  entry.count++;
  return { allowed: true, remaining: maxRequests - entry.count };
}

/**
 * Fixed-window rate limit. Returns whether the call is allowed.
 *
 * Fixed windows can allow up to 2x the limit across a window boundary; that is
 * acceptable here and far cheaper than a sliding log.
 */
export async function rateLimit(
  key: string,
  maxRequests: number = 10,
  windowMs: number = 60_000
): Promise<{ allowed: boolean; remaining: number }> {
  const redisKey = `${KEY_PREFIX}${key}`;

  const count = await redisCommand(["INCR", redisKey]);
  if (count !== null && /^\d+$/.test(count)) {
    const n = Number(count);
    if (n === 1) {
      // First hit in this window: start the clock.
      await redisCommand(["PEXPIRE", redisKey, String(windowMs)]);
    }
    if (n > maxRequests) {
      return { allowed: false, remaining: 0 };
    }
    return { allowed: true, remaining: maxRequests - n };
  }

  // Redis unavailable — degrade, but say so once a minute.
  const now = Date.now();
  if (now - lastFallbackWarn > FALLBACK_WARN_INTERVAL) {
    lastFallbackWarn = now;
    console.warn(
      "[rate-limit] Redis unavailable, using in-process fallback (limits are per-process and reset on restart)"
    );
  }
  return fallbackRateLimit(key, maxRequests, windowMs);
}

// Keep the fallback map from growing without bound.
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of fallbackMap.entries()) {
      if (now > entry.resetAt) fallbackMap.delete(key);
    }
  }, 60_000);
}
