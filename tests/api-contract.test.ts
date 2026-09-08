/**
 * Contract tests for the public API.
 *
 * Run: npm test
 *
 * These pin the *shape* of what `/api/v1` and the embed endpoint return, not the
 * data. A second client (mobile, bot, partner integration) fails silently when a
 * field is renamed or a type changes, so the shape is the thing worth asserting.
 *
 * The endpoint handlers are exercised through their pure dependencies and a live
 * smoke script (`scripts/api-smoke.mjs`) runs the real HTTP surface in CI-adjacent
 * manual checks. Here we lock the envelope helpers and the payload builders that
 * every route shares.
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { ok, fail, pagination } from "../src/lib/api-response.ts";

function jsonOf(res: Response): Promise<Record<string, unknown>> {
  return res.json() as Promise<Record<string, unknown>>;
}

describe("ok() envelope", () => {
  test("data alone has no meta key", async () => {
    const body = await jsonOf(ok([1, 2, 3]));
    assert.deepEqual(Object.keys(body), ["data"]);
    assert.deepEqual(body.data, [1, 2, 3]);
  });

  test("meta is nested, never merged into data", async () => {
    const body = await jsonOf(ok({ a: 1 }, { total: 9 }));
    assert.deepEqual(body, { data: { a: 1 }, meta: { total: 9 } });
  });

  test("is a 200 JSON response", async () => {
    const res = ok({});
    assert.equal(res.status, 200);
    assert.match(res.headers.get("content-type") ?? "", /application\/json/);
  });
});

describe("fail() envelope", () => {
  test("always uses an `error` string", async () => {
    const res = fail("Nope", 400);
    assert.equal(res.status, 400);
    assert.deepEqual(await jsonOf(res), { error: "Nope" });
  });

  test("preserves the status code", async () => {
    for (const status of [400, 401, 403, 404, 422, 429]) {
      assert.equal(fail("x", status).status, status);
    }
  });
});

describe("pagination()", () => {
  const req = (qs: string) => new Request(`https://example.test/api/v1/x${qs}`);

  test("defaults when no params are given", () => {
    const p = pagination(req(""));
    assert.equal(p.limit, 20);
    assert.equal(p.offset, 0);
  });

  test("honours a custom default", () => {
    assert.equal(pagination(req(""), 50, 100).limit, 50);
  });

  test("clamps limit to the maximum", () => {
    assert.equal(pagination(req("?limit=9999"), 20, 50).limit, 50);
  });

  test("clamps limit to at least 1", () => {
    assert.equal(pagination(req("?limit=0")).limit, 1);
    assert.equal(pagination(req("?limit=-5")).limit, 1);
  });

  test("never returns a negative offset", () => {
    assert.equal(pagination(req("?offset=-10")).offset, 0);
  });

  test("accepts a valid offset", () => {
    assert.equal(pagination(req("?offset=40")).offset, 40);
  });

  test("ignores non-numeric values rather than producing NaN", () => {
    const p = pagination(req("?limit=abc&offset=xyz"));
    assert.equal(p.limit, 20);
    assert.equal(p.offset, 0);
    assert.ok(Number.isFinite(p.limit) && Number.isFinite(p.offset));
  });

  test("floors fractional values", () => {
    assert.equal(pagination(req("?limit=12.9&offset=3.7")).limit, 12);
    assert.equal(pagination(req("?limit=12.9&offset=3.7")).offset, 3);
  });
});
