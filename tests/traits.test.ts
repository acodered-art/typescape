/**
 * Unit tests for the trait-survey vector math.
 *
 * Run: npm test
 *
 * These cover two defects that shipped: percentages whose printed values did
 * not add up to 100, and a minimum-shift that gave opposite-trait patterns a
 * nonzero share.
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  cosineSimilarity,
  euclideanDistance,
  similarityToPercentage,
  describeBreakdown,
  emergentComorbidities,
  findInversions,
  describeInversion,
  type PercentageEntry,
} from "../src/lib/traits.ts";

const E = (disorderId: string, similarity: number): { disorderId: string; similarity: number } => ({
  disorderId,
  similarity,
});

describe("cosineSimilarity", () => {
  // Float math: compare with a tolerance rather than strict equality.
  const close = (actual: number, expected: number) =>
    assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} !≈ ${expected}`);

  test("identical vectors are 1", () => {
    close(cosineSimilarity([1, 2, 3], [1, 2, 3]), 1);
  });

  test("opposite vectors are -1", () => {
    close(cosineSimilarity([1, 2, 3], [-1, -2, -3]), -1);
  });

  test("orthogonal vectors are 0", () => {
    close(cosineSimilarity([1, 0], [0, 1]), 0);
  });

  test("a zero vector does not divide by zero", () => {
    assert.equal(cosineSimilarity([0, 0], [1, 1]), 0);
  });

  test("scale does not matter", () => {
    close(cosineSimilarity([2, 4], [1, 2]), 1);
  });
});

describe("euclideanDistance", () => {
  test("identical vectors are 0", () => {
    assert.equal(euclideanDistance([1, 2], [1, 2]), 0);
  });

  test("a 3-4-5 triangle", () => {
    assert.equal(euclideanDistance([0, 0], [3, 4]), 5);
  });

  test("is symmetric", () => {
    assert.equal(euclideanDistance([1, 5], [4, 1]), euclideanDistance([4, 1], [1, 5]));
  });
});

describe("similarityToPercentage", () => {
  test("percentages always sum to exactly 100", () => {
    // The real 11-pattern breakdown that exposed the drift.
    const sims = [
      E("h", 0.611), E("o", 0.332), E("a", 0.192), E("b", 0.181),
      E("c", 0.114), E("d", 0.097), E("n", 0), E("e", -0.333),
      E("f", -0.373), E("g", -0.416), E("h2", -0.613),
    ];
    const out = similarityToPercentage(sims);
    assert.equal(out.reduce((s, o) => s + o.percentage, 0), 100);
  });

  test("thirds still sum to 100", () => {
    const out = similarityToPercentage([E("a", 1), E("b", 1), E("c", 1)]);
    assert.equal(out.reduce((s, o) => s + o.percentage, 0), 100);
  });

  test("opposite-trait patterns score zero, not a shifted share", () => {
    const out = similarityToPercentage([E("pos", 0.8), E("neg", -0.8)]);
    const neg = out.find((o) => o.disorderId === "neg");
    const pos = out.find((o) => o.disorderId === "pos");
    assert.equal(neg?.percentage, 0);
    assert.equal(pos?.percentage, 100);
  });

  test("the strongest pattern gets the largest share", () => {
    const out = similarityToPercentage([E("top", 0.9), E("mid", 0.5), E("low", 0.1)]);
    const sorted = [...out].sort((a, b) => b.percentage - a.percentage);
    assert.equal(sorted[0].disorderId, "top");
  });

  test("all-zero similarities yield all-zero percentages", () => {
    const out = similarityToPercentage([E("a", 0), E("b", -1)]);
    assert.deepEqual(out.map((o) => o.percentage), [0, 0]);
  });

  test("an empty list is safe", () => {
    assert.deepEqual(similarityToPercentage([]), []);
  });

  test("similarity is echoed at 3 decimal places", () => {
    const out = similarityToPercentage([E("a", 0.123456)]);
    assert.equal(out[0].similarity, 0.123);
  });
});

describe("describeBreakdown", () => {
  const P = (disorderId: string, percentage: number): PercentageEntry => ({
    disorderId,
    similarity: percentage / 100,
    percentage,
  });

  test("no voters is empty", () => {
    assert.equal(describeBreakdown([P("a", 100)], 0).kind, "empty");
  });

  test("an empty breakdown is empty", () => {
    assert.equal(describeBreakdown([], 5).kind, "empty");
  });

  test("a weak top match reads as none", () => {
    assert.equal(describeBreakdown([P("a", 12), P("b", 11)], 5).kind, "none");
  });

  test("two close leaders read as intermediate", () => {
    assert.equal(describeBreakdown([P("a", 30), P("b", 27)], 5).kind, "intermediate");
  });

  test("a strong second reads as an accent", () => {
    assert.equal(describeBreakdown([P("a", 45), P("b", 20)], 5).kind, "accent");
  });

  test("one clear winner reads as single", () => {
    assert.equal(describeBreakdown([P("a", 60), P("b", 10)], 5).kind, "single");
  });

  test("a low-percentage accent does not mask the none verdict", () => {
    // 14 and 12 are within the 5-point gap but below the 15% floor.
    assert.equal(describeBreakdown([P("a", 14), P("b", 12)], 5).kind, "none");
  });

  test("carries the entries through for the caller", () => {
    const v = describeBreakdown([P("a", 60), P("b", 10)], 5);
    assert.equal(v.kind, "single");
    if (v.kind === "single") assert.equal(v.top.disorderId, "a");
  });
});

describe("emergentComorbidities", () => {
  const P = (disorderId: string, percentage: number): PercentageEntry => ({
    disorderId,
    similarity: percentage / 100,
    percentage,
  });

  test("no pair when only one pattern is above the floor", () => {
    assert.deepEqual(emergentComorbidities([P("a", 70), P("b", 10)]), []);
  });

  test("a balanced pair is detected", () => {
    const pairs = emergentComorbidities([P("a", 40), P("b", 40)]);
    assert.equal(pairs.length, 1);
    assert.equal(pairs[0].strength, 40);
  });

  test("strength is the geometric mean, so a lopsided pair is weaker", () => {
    const [strong] = emergentComorbidities([P("a", 50), P("b", 50)]);
    const [weak] = emergentComorbidities([P("a", 80), P("b", 20)]);
    assert.ok(strong.strength > weak.strength);
    assert.equal(weak.strength, 40);
  });

  test("three qualifying patterns produce three pairs", () => {
    const pairs = emergentComorbidities([P("a", 30), P("b", 25), P("c", 22)]);
    assert.equal(pairs.length, 3);
  });

  test("pairs are sorted strongest first", () => {
    const pairs = emergentComorbidities([P("a", 40), P("b", 40), P("c", 20)]);
    assert.ok(pairs[0].strength >= pairs[pairs.length - 1].strength);
  });

  test("the floor is configurable", () => {
    assert.equal(emergentComorbidities([P("a", 15), P("b", 15)], 10).length, 1);
    assert.equal(emergentComorbidities([P("a", 15), P("b", 15)], 20).length, 0);
  });
});

describe("findInversions", () => {
  const T = (slug: string, avg: number) => ({
    slug,
    name: slug.replace(/-/g, " "),
    avg,
    lowLabel: "Low",
    highLabel: "High",
  });

  test("detects an axis pointing the opposite way from the pattern", () => {
    // Community says +3 (callous); the pattern expects -3 (warm).
    const inv = findInversions([T("empathy", 3)], [-3]);
    assert.equal(inv.length, 1);
    assert.equal(inv[0].slug, "empathy");
    assert.equal(inv[0].communityLabel, "High");
    assert.equal(inv[0].patternLabel, "Low");
    assert.equal(inv[0].gap, 6);
  });

  test("same-direction axes are not inversions", () => {
    assert.deepEqual(findInversions([T("empathy", 3)], [3]), []);
  });

  test("a near-neutral community reading is not an inversion", () => {
    // |community| < floor.
    assert.deepEqual(findInversions([T("empathy", 0.5)], [-3]), []);
  });

  test("a near-neutral pattern value is not an inversion", () => {
    assert.deepEqual(findInversions([T("empathy", 3)], [-0.5]), []);
  });

  test("a gap smaller than minGap is ignored", () => {
    // Opposite signs but only 2 apart at the default minGap of 3.
    assert.deepEqual(findInversions([T("empathy", 1)], [-1]), []);
  });

  test("results are sorted by gap, strongest first", () => {
    const inv = findInversions(
      [T("empathy", 3), T("trust", -3), T("anxiety", 3)],
      [-1, 1, -3]
    );
    // gaps: empathy 4, trust 4, anxiety 6
    assert.equal(inv[0].slug, "anxiety");
    assert.equal(inv[0].gap, 6);
    assert.ok(inv[1].gap <= inv[0].gap);
  });

  test("missing pattern values are skipped", () => {
    assert.deepEqual(findInversions([T("empathy", 3), T("trust", -3)], [-3]), [
      {
        slug: "empathy",
        name: "empathy",
        communityValue: 3,
        patternValue: -3,
        communityLabel: "High",
        patternLabel: "Low",
        gap: 6,
      },
    ]);
  });

  test("thresholds are configurable", () => {
    assert.equal(findInversions([T("empathy", 1)], [-1], 0.5, 2).length, 1);
  });
});

describe("describeInversion", () => {
  const inv = [
    { slug: "empathy", name: "Empathy", communityValue: 3, patternValue: -3,
      communityLabel: "Callous", patternLabel: "Warm", gap: 6 },
  ];

  test("names the pattern and the axis", () => {
    assert.equal(
      describeInversion("Borderline Personality Disorder", inv),
      "Borderline Personality Disorder, inverted to empathy"
    );
  });

  test("returns null when there is no inversion", () => {
    assert.equal(describeInversion("Borderline Personality Disorder", []), null);
  });
});
