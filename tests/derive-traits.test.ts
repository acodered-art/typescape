/**
 * Unit tests for deriving trait vectors from a type assignment.
 *
 * Run: npm test
 *
 * The property that matters: a derived value only appears on an axis the source
 * type actually speaks to, and confidence never claims survey-level authority.
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { deriveVector, AXIS_ORDER } from "../src/lib/derive-traits.ts";

const idx = (axis: string) => AXIS_ORDER.indexOf(axis as never);

describe("deriveVector — MBTI", () => {
  test("extraversion moves social axes positive", () => {
    const d = deriveVector([{ system: "mbti", type: "ENFP" }]);
    assert.ok((d.values[idx("social-orientation")] ?? 0) > 0);
    assert.ok((d.values[idx("attention-seeking")] ?? 0) > 0);
  });

  test("introversion is the mirror of extraversion", () => {
    const e = deriveVector([{ system: "mbti", type: "ENFP" }]);
    const i = deriveVector([{ system: "mbti", type: "INFP" }]);
    assert.ok((e.values[idx("social-orientation")] ?? 0) > (i.values[idx("social-orientation")] ?? 0));
  });

  test("feeling scores empathy above thinking", () => {
    const f = deriveVector([{ system: "mbti", type: "INFP" }]);
    const t = deriveVector([{ system: "mbti", type: "INTP" }]);
    assert.ok((f.values[idx("empathy")] ?? 0) > (t.values[idx("empathy")] ?? 0));
  });

  test("judging is less flexible than perceiving", () => {
    const j = deriveVector([{ system: "mbti", type: "INFJ" }]);
    const p = deriveVector([{ system: "mbti", type: "INFP" }]);
    assert.ok((j.values[idx("flexibility")] ?? 0) < (p.values[idx("flexibility")] ?? 0));
  });

  test("axes no letter speaks to stay null rather than being guessed", () => {
    // MBTI says nothing about anxiety or trust.
    const d = deriveVector([{ system: "mbti", type: "ENFP" }]);
    assert.equal(d.values[idx("anxiety")], null);
    assert.equal(d.values[idx("trust")], null);
  });

  test("values stay within -3..3", () => {
    for (const t of ["ESTJ", "INFP", "ENTP", "ISFJ"]) {
      for (const v of deriveVector([{ system: "mbti", type: t }]).values) {
        if (v !== null) assert.ok(v >= -3 && v <= 3, `${t} produced ${v}`);
      }
    }
  });
});

describe("deriveVector — Enneagram", () => {
  test("type 6 is high anxiety", () => {
    const d = deriveVector([{ system: "enneagram", type: "6" }]);
    assert.ok((d.values[idx("anxiety")] ?? 0) >= 2);
  });

  test("type 7 is low anxiety and impulsive", () => {
    const d = deriveVector([{ system: "enneagram", type: "7" }]);
    assert.ok((d.values[idx("anxiety")] ?? 0) < 0);
    assert.ok((d.values[idx("impulse-control")] ?? 0) > 0);
  });

  test("type 2 scores empathy highly", () => {
    const d = deriveVector([{ system: "enneagram", type: "2" }]);
    assert.ok((d.values[idx("empathy")] ?? 0) >= 2);
  });

  test("a wing is ignored, the core decides", () => {
    const core = deriveVector([{ system: "enneagram", type: "4" }]);
    const wing = deriveVector([{ system: "enneagram", type: "4w5" }]);
    assert.deepEqual(core.values, wing.values);
  });

  test("an unknown type derives nothing rather than throwing", () => {
    const d = deriveVector([{ system: "enneagram", type: "99" }]);
    assert.equal(d.covered, 0);
    assert.equal(d.confidence, 0);
  });
});

describe("deriveVector — Big Five", () => {
  test("high openness raises conventionality", () => {
    const d = deriveVector([{ system: "big-five", type: "O" }]);
    assert.ok((d.values[idx("conventionality")] ?? 0) > 0);
  });

  test("agreeableness raises empathy and trust", () => {
    const d = deriveVector([{ system: "big-five", type: "A" }]);
    assert.ok((d.values[idx("empathy")] ?? 0) > 0);
    assert.ok((d.values[idx("trust")] ?? 0) > 0);
  });

  test("neuroticism lowers stability and raises anxiety", () => {
    const d = deriveVector([{ system: "big-five", type: "N" }]);
    assert.ok((d.values[idx("emotional-stability")] ?? 0) < 0);
    assert.ok((d.values[idx("anxiety")] ?? 0) > 0);
  });
});

describe("deriveVector — merging and confidence", () => {
  test("two systems are averaged where both speak", () => {
    const d = deriveVector([
      { system: "mbti", type: "ENFP" },
      { system: "enneagram", type: "4" },
    ]);
    const social = d.values[idx("social-orientation")];
    assert.ok(social !== null, "should be informed by MBTI");
    assert.ok(d.sources.includes("mbti") && d.sources.includes("enneagram"));
  });

  test("a system the site does not support is ignored", () => {
    const d = deriveVector([{ system: "talanovism", type: "1L" }]);
    assert.equal(d.covered, 0);
    assert.deepEqual(d.sources, []);
  });

  test("confidence never exceeds 0.8 — derived is weaker than surveyed", () => {
    const d = deriveVector([
      { system: "mbti", type: "ENFP" },
      { system: "enneagram", type: "7" },
      { system: "big-five", type: "O" },
    ]);
    assert.ok(d.confidence <= 0.8, `got ${d.confidence}`);
  });

  test("more coverage means higher confidence", () => {
    const one = deriveVector([{ system: "enneagram", type: "1" }]);
    const many = deriveVector([
      { system: "mbti", type: "INTJ" },
      { system: "enneagram", type: "5" },
      { system: "big-five", type: "OCEAN" },
    ]);
    assert.ok(many.confidence > one.confidence);
  });

  test("every value carries a reason", () => {
    const d = deriveVector([{ system: "mbti", type: "ENFP" }]);
    d.values.forEach((v, i) => {
      if (v === null) return;
      assert.ok(d.reasons[AXIS_ORDER[i]], `${AXIS_ORDER[i]} has no reason`);
    });
  });

  test("no typings derives nothing", () => {
    const d = deriveVector([]);
    assert.equal(d.covered, 0);
    assert.equal(d.confidence, 0);
  });
});
