/**
 * Unit tests for the trusted client-IP resolver.
 *
 * Run: npm test
 *
 * The point of these tests is that `x-forwarded-for` is NEVER trusted: it is a
 * client-writable header, and honouring it would let a caller mint a fresh rate
 * limit bucket per request.
 */
import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

const ENV_KEYS = ["TRUST_CF_HEADERS", "TRUST_PROXY_HEADERS"] as const;

async function loadFresh() {
  // Re-import with a cache-busting query so the module-level env read re-runs.
  const mod = await import(`../src/lib/client-ip.ts?v=${Math.random()}`);
  return mod as typeof import("../src/lib/client-ip.ts");
}

function req(headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/x", { headers });
}

describe("clientIp with proxy headers untrusted (default)", () => {
  beforeEach(() => {
    for (const k of ENV_KEYS) delete process.env[k];
  });

  test("ignores x-forwarded-for entirely", async () => {
    const { clientIp } = await loadFresh();
    assert.equal(clientIp(req({ "x-forwarded-for": "1.2.3.4" })), "unknown");
  });

  test("ignores cf-connecting-ip", async () => {
    const { clientIp } = await loadFresh();
    assert.equal(clientIp(req({ "cf-connecting-ip": "1.2.3.4" })), "unknown");
  });

  test("returns unknown when no headers at all", async () => {
    const { clientIp } = await loadFresh();
    assert.equal(clientIp(req()), "unknown");
  });
});

describe("clientIp with TRUST_CF_HEADERS=true", () => {
  beforeEach(() => {
    process.env.TRUST_CF_HEADERS = "true";
  });
  afterEach(() => {
    for (const k of ENV_KEYS) delete process.env[k];
  });

  test("prefers cf-connecting-ip", async () => {
    const { clientIp } = await loadFresh();
    const r = req({ "cf-connecting-ip": "9.9.9.9", "x-real-ip": "8.8.8.8" });
    assert.equal(clientIp(r), "9.9.9.9");
  });

  test("falls back to x-real-ip", async () => {
    const { clientIp } = await loadFresh();
    assert.equal(clientIp(req({ "x-real-ip": "8.8.8.8" })), "8.8.8.8");
  });

  test("still ignores x-forwarded-for", async () => {
    const { clientIp } = await loadFresh();
    assert.equal(clientIp(req({ "x-forwarded-for": "1.2.3.4" })), "unknown");
  });
});

describe("isInternalIp", () => {
  test("treats loopback, docker bridge and private ranges as internal", async () => {
    const { isInternalIp } = await import("../src/lib/client-ip.ts");
    for (const ip of [
      "127.0.0.1",
      "::1",
      "unknown",
      "172.18.0.5",
      "10.1.2.3",
      "192.168.1.121",
      "::ffff:127.0.0.1",
      "",
    ]) {
      assert.equal(isInternalIp(ip), true, `${ip} should be internal`);
    }
  });

  test("treats public addresses as external", async () => {
    const { isInternalIp } = await import("../src/lib/client-ip.ts");
    for (const ip of ["8.8.8.8", "1.1.1.1", "203.0.113.9"]) {
      assert.equal(isInternalIp(ip), false, `${ip} should be external`);
    }
  });
});
