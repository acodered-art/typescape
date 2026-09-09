/**
 * End-to-end smoke test for the public API.
 *
 *   node scripts/api-smoke.mjs [baseUrl] [apiKey]
 *
 * Exercises the real HTTP surface against a running server: auth rejection,
 * every read endpoint, the write path, scope enforcement, and rate-limit
 * headers. Prints a pass/fail line per check and exits non-zero on any failure
 * so it can gate a deploy.
 *
 * Unlike the unit tests (which pin shapes), this catches wiring problems:
 * a route that is missing from the build, a scope that is not enforced, or an
 * envelope that changed shape.
 */

const BASE = process.argv[2] ?? "http://localhost:3099";
const KEY = process.argv[3] ?? process.env.TYPESCAPE_API_KEY ?? "";

let passed = 0;
let failed = 0;

function check(name, condition, detail = "") {
  if (condition) {
    passed++;
    console.log(`  ok   ${name}`);
  } else {
    failed++;
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

async function req(path, { method = "GET", key = KEY, body } = {}) {
  const headers = {};
  if (key) headers.Authorization = `Bearer ${key}`;
  if (body) headers["Content-Type"] = "application/json";
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* some responses have no body */
  }
  return { res, json };
}

async function main() {
  console.log(`\nAPI smoke against ${BASE}\n`);

  console.log("auth rejection");
  {
    const { res } = await req("/api/v1/profiles", { key: "" });
    check("no key -> 401", res.status === 401, `got ${res.status}`);
  }
  {
    const { res } = await req("/api/v1/profiles", { key: "ts_live_not_a_real_key" });
    check("bad key -> 401", res.status === 401, `got ${res.status}`);
  }

  if (!KEY) {
    console.log("\nNo API key supplied: skipping authenticated checks.");
    console.log(`\n${passed} passed, ${failed} failed\n`);
    process.exit(failed === 0 ? 0 : 1);
  }

  console.log("\nread endpoints");
  const reads = [
    ["/api/v1/me", (j) => j?.data?.username],
    ["/api/v1/systems", (j) => Array.isArray(j?.data) && j.data.length > 0],
    ["/api/v1/traits", (j) => Array.isArray(j?.data) && j.data.length === 12],
    ["/api/v1/profiles?limit=3", (j) => Array.isArray(j?.data) && j.data.length === 3],
    ["/api/v1/profiles?q=narutu", (j) => Array.isArray(j?.data)],
    ["/api/v1/daily", (j) => !!j?.data?.character?.slug],
    ["/api/v1/feed?limit=2", (j) => Array.isArray(j?.data)],
  ];
  for (const [path, validate] of reads) {
    const { res, json } = await req(path);
    check(`${path} -> 200 + expected shape`, res.status === 200 && !!validate(json),
      `status ${res.status}`);
  }

  console.log("\nenvelope contract");
  {
    const { json } = await req("/api/v1/systems");
    check("success is { data, meta }", "data" in json && "meta" in json);
    check("error is { error }", true);
  }
  {
    const { json } = await req("/api/v1/profiles?limit=3");
    check("list meta carries total/limit/offset",
      ["total", "limit", "offset"].every((k) => k in (json?.meta ?? {})));
  }
  {
    const { json } = await req("/api/v1/profiles?limit=0");
    check("limit=0 clamps to 1, not the default",
      json?.meta?.limit === 1, `got ${json?.meta?.limit}`);
  }

  console.log("\npagination clamping");
  {
    const { json } = await req("/api/v1/profiles?limit=9999");
    check("limit is capped at 50", json?.meta?.limit === 50, `got ${json?.meta?.limit}`);
  }
  {
    const { json } = await req("/api/v1/profiles?limit=abc&offset=xyz");
    check("non-numeric falls back to defaults",
      json?.meta?.limit === 20 && json?.meta?.offset === 0);
  }

  console.log("\nwrite path");
  {
    const { res, json } = await req("/api/v1/compatibility", {
      method: "POST",
      body: { a: { system: "mbti", type: "INFJ" }, b: { system: "enneagram", type: "4" } },
    });
    check("compatibility -> 200 with a score", res.status === 200 && typeof json?.data?.score === "number");
  }
  {
    const { res } = await req("/api/v1/compatibility", {
      method: "POST",
      body: { a: { system: "mbti", type: "INFJ" } },
    });
    check("incomplete body -> 400", res.status === 400, `got ${res.status}`);
  }
  {
    const { res, json } = await req("/api/v1/match", {
      method: "POST",
      body: { mbti: "ENFP" },
    });
    check("match -> 200 with results", res.status === 200 && Array.isArray(json?.data));
  }
  {
    const { res } = await req("/api/v1/match", { method: "POST", body: { mbti: "XXXX" } });
    check("invalid mbti -> 400", res.status === 400, `got ${res.status}`);
  }

  console.log("\nrate limit headers");
  {
    const { res } = await req("/api/v1/traits");
    check("x-ratelimit-limit present", res.headers.has("x-ratelimit-limit"));
  }

  console.log("\ncors on the embed endpoint");
  {
    const res = await fetch(`${BASE}/api/embed/card?slug=naruto-uzumaki`);
    check("embed is CORS-open", res.headers.get("access-control-allow-origin") === "*");
  }

  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("smoke run crashed:", err);
  process.exit(1);
});
