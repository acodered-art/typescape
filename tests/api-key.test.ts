/**
 * Unit tests for API key generation and hashing.
 *
 * Run: npm test
 *
 * `api-auth.ts` imports Prisma, so only the pure helpers are imported here and
 * the network-facing `authenticateApiRequest` is covered by the live smoke
 * test instead (see COMMERCIAL-ROADMAP Sprint 7).
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { generateApiKey, hashKey } from "../src/lib/api-key.ts";

describe("generateApiKey", () => {
  test("produces a prefixed key", () => {
    const { key } = generateApiKey();
    assert.ok(key.startsWith("ts_live_"), `unexpected prefix: ${key}`);
  });

  test("the hash is the SHA-256 of the key", () => {
    const { key, hash } = generateApiKey();
    assert.equal(hash, crypto.createHash("sha256").update(key).digest("hex"));
  });

  test("the prefix is a display-safe slice of the key", () => {
    const { key, prefix } = generateApiKey();
    assert.equal(prefix, key.slice(0, 16));
    assert.ok(key.startsWith(prefix));
  });

  test("keys are unique across many generations", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 500; i++) seen.add(generateApiKey().key);
    assert.equal(seen.size, 500);
  });

  test("the secret is long enough to resist guessing", () => {
    const { key } = generateApiKey();
    assert.ok(key.length >= 40, `too short: ${key.length}`);
  });
});

describe("hashKey", () => {
  test("is deterministic", () => {
    assert.equal(hashKey("ts_live_abc"), hashKey("ts_live_abc"));
  });

  test("differs for different inputs", () => {
    assert.notEqual(hashKey("ts_live_abc"), hashKey("ts_live_abd"));
  });

  test("returns a 64-char hex digest", () => {
    assert.match(hashKey("anything"), /^[0-9a-f]{64}$/);
  });
});
