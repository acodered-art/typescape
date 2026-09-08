/**
 * Unit tests for the two-person compatibility report.
 *
 * Run: npm test
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { calcCompatibility } from "../src/lib/compatibility.ts";

const NAMES = { mbti: "MBTI", enneagram: "Enneagram", "big-five": "Big Five" };
const R = (system: string, type: string) => ({ system, type });

describe("calcCompatibility", () => {
  test("an exact same-system match scores 100", () => {
    const c = calcCompatibility(R("mbti", "INFP"), R("mbti", "INFP"), NAMES);
    assert.equal(c.score, 100);
    assert.equal(c.basis, "same-type");
  });

  test("the match is case-insensitive", () => {
    const c = calcCompatibility(R("mbti", "infp"), R("mbti", "INFP"), NAMES);
    assert.equal(c.score, 100);
  });

  test("different types in the same system do not score", () => {
    const c = calcCompatibility(R("mbti", "INFP"), R("mbti", "ESTJ"), NAMES);
    assert.equal(c.score, null);
    assert.ok(c.divergences.some((d) => d.includes("INFP")));
  });

  test("a known cross-system correlation produces its strength", () => {
    // INFJ ↔ Enneagram 4 is recorded at 0.45.
    const c = calcCompatibility(R("mbti", "INFJ"), R("enneagram", "4"), NAMES);
    assert.equal(c.basis, "correlated");
    assert.equal(c.score, 45);
    assert.ok(c.link);
  });

  test("the correlation is found in either direction", () => {
    const forward = calcCompatibility(R("mbti", "INFJ"), R("enneagram", "4"), NAMES);
    const reverse = calcCompatibility(R("enneagram", "4"), R("mbti", "INFJ"), NAMES);
    assert.equal(forward.score, reverse.score);
  });

  test("uncorrelated systems are reported honestly, not guessed", () => {
    const c = calcCompatibility(R("mbti", "INFP"), R("naranjogram", "9"), NAMES);
    assert.equal(c.score, null);
    assert.equal(c.basis, "unrelated");
    assert.match(c.summary, /no recorded link/i);
  });

  test("missing input is incomparable rather than a crash", () => {
    const c = calcCompatibility(R("", ""), R("mbti", "INFP"), NAMES);
    assert.equal(c.score, null);
    assert.equal(c.basis, "incomparable");
  });

  test("the summary names both readings", () => {
    const c = calcCompatibility(R("mbti", "INTJ"), R("enneagram", "5"), NAMES);
    assert.ok(c.agreements.length > 0);
  });
});
