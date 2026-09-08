/**
 * Unit tests for plan resolution and gating.
 *
 * Run: npm test
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  PLANS,
  PLAN_ORDER,
  getPlan,
  hasFeature,
  isPlanSlug,
  effectivePlanSlug,
  formatPrice,
} from "../src/lib/plans.ts";

describe("plan definitions", () => {
  test("every slug in the order has a definition", () => {
    for (const slug of PLAN_ORDER) assert.ok(PLANS[slug], `missing plan ${slug}`);
  });

  test("limits increase with price", () => {
    const ordered = PLAN_ORDER.map((s) => PLANS[s]);
    for (let i = 1; i < ordered.length; i++) {
      assert.ok(ordered[i].apiRateLimit > ordered[i - 1].apiRateLimit, "rate limit must increase");
      assert.ok(ordered[i].maxApiKeys > ordered[i - 1].maxApiKeys, "key count must increase");
      assert.ok(ordered[i].priceCents > ordered[i - 1].priceCents, "price must increase");
    }
  });

  test("free is free", () => {
    assert.equal(PLANS.free.priceCents, 0);
  });
});

describe("getPlan", () => {
  test("resolves a known slug", () => {
    assert.equal(getPlan("pro").slug, "pro");
  });

  test("falls back to free for unknown or missing values", () => {
    assert.equal(getPlan("enterprise").slug, "free");
    assert.equal(getPlan(null).slug, "free");
    assert.equal(getPlan(undefined).slug, "free");
    assert.equal(getPlan("").slug, "free");
  });
});

describe("isPlanSlug", () => {
  test("accepts the defined slugs only", () => {
    assert.equal(isPlanSlug("free"), true);
    assert.equal(isPlanSlug("pro"), true);
    assert.equal(isPlanSlug("business"), true);
    assert.equal(isPlanSlug("gold"), false);
    assert.equal(isPlanSlug(""), false);
  });
});

describe("hasFeature", () => {
  test("free lacks the vector tools and bulk export", () => {
    assert.equal(hasFeature("free", "advancedVectors"), false);
    assert.equal(hasFeature("free", "bulkExport"), false);
  });

  test("pro and business include them", () => {
    assert.equal(hasFeature("pro", "advancedVectors"), true);
    assert.equal(hasFeature("business", "bulkExport"), true);
  });

  test("an unknown plan gets free features, not paid ones", () => {
    assert.equal(hasFeature("nonsense", "advancedVectors"), false);
  });
});

describe("effectivePlanSlug", () => {
  const future = new Date(Date.now() + 86_400_000);
  const past = new Date(Date.now() - 86_400_000);

  test("an active subscription inside its period wins", () => {
    const p = effectivePlanSlug({ planSlug: "pro", status: "active", currentPeriodEnd: future }, "free");
    assert.equal(p, "pro");
  });

  test("past_due still counts while inside the period", () => {
    const p = effectivePlanSlug({ planSlug: "pro", status: "past_due", currentPeriodEnd: future }, "free");
    assert.equal(p, "pro");
  });

  test("an expired period falls back to free even if active", () => {
    const p = effectivePlanSlug({ planSlug: "pro", status: "active", currentPeriodEnd: past }, "free");
    assert.equal(p, "free");
  });

  test("a canceled subscription falls back to free", () => {
    const p = effectivePlanSlug({ planSlug: "pro", status: "canceled", currentPeriodEnd: future }, "free");
    assert.equal(p, "free");
  });

  test("without a subscription the stored plan is used", () => {
    assert.equal(effectivePlanSlug(null, "business"), "business");
  });

  test("without a subscription or a valid stored plan it is free", () => {
    assert.equal(effectivePlanSlug(null, null), "free");
    assert.equal(effectivePlanSlug(undefined, "gold"), "free");
  });
});

describe("formatPrice", () => {
  test("zero is Free", () => {
    assert.equal(formatPrice(0), "Free");
  });

  test("whole dollars have no decimals", () => {
    assert.equal(formatPrice(900), "$9/mo");
  });

  test("cents are shown when needed", () => {
    assert.equal(formatPrice(1250), "$12.50/mo");
  });
});
