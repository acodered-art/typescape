/**
 * Unit tests for the pure helpers in src/lib/utils.ts.
 *
 * Run: npm test
 *
 * Uses the Node built-in test runner with type stripping, so there is no
 * new dependency and no build step.
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { calcConsensus, calcVoteWeight, slugify, generateSlug } from "../src/lib/utils.ts";

const V = (voteValue: number, weight = 1) => ({ voteValue, weight });

describe("calcConsensus", () => {
  test("all upvotes is 100%", () => {
    const r = calcConsensus([V(1), V(1), V(1), V(1), V(1)]);
    assert.equal(r.percentage, 100);
    assert.equal(r.voteCount, 5);
    assert.equal(r.hasConsensus, true);
  });

  test("all downvotes is 0%", () => {
    const r = calcConsensus([V(-1), V(-1), V(-1), V(-1), V(-1)]);
    assert.equal(r.percentage, 0);
    assert.equal(r.hasConsensus, true);
  });

  test("an even split is 50%", () => {
    const r = calcConsensus([V(1), V(1), V(1), V(-1), V(-1), V(-1)], 0);
    assert.equal(r.percentage, 50);
    assert.equal(r.weightedSum, 0);
  });

  test("one upvote against four downvotes is 20%", () => {
    assert.equal(calcConsensus([V(1), V(-1), V(-1), V(-1), V(-1)]).percentage, 20);
  });

  test("weights shift the percentage", () => {
    // two weight-3 upvotes vs one weight-1 downvote = 6 up / 7 total
    const r = calcConsensus([V(1, 3), V(1, 3), V(-1, 1)], 0);
    assert.equal(r.percentage, Math.round((6 / 7) * 100));
  });

  test("below minVoters reports no consensus instead of a fake 0%", () => {
    const r = calcConsensus([V(1), V(1), V(1), V(1)]); // default min is 5
    assert.equal(r.percentage, 0);
    assert.equal(r.hasConsensus, false);
    assert.equal(r.voteCount, 4);
  });

  test("minVoters=0 always reports consensus", () => {
    const r = calcConsensus([V(1)], 0);
    assert.equal(r.percentage, 100);
    assert.equal(r.hasConsensus, true);
  });

  test("an empty list is not a crash", () => {
    const r = calcConsensus([], 0);
    assert.deepEqual(r, {
      percentage: 0,
      weightedSum: 0,
      totalWeight: 0,
      voteCount: 0,
      hasConsensus: false,
    });
  });

  test("a NaN weight does not poison the result", () => {
    const r = calcConsensus([V(1, NaN), V(1, NaN)], 0);
    assert.equal(r.percentage, 100);
    assert.equal(r.hasConsensus, true);
  });

  test("a zero or negative weight falls back to the baseline 1", () => {
    assert.equal(calcConsensus([V(1, 0), V(1, 0)], 0).percentage, 100);
    assert.equal(calcConsensus([V(1, -5), V(1, -5)], 0).totalWeight, 2);
  });

  test("an out-of-range voteValue is coerced to a valid sign", () => {
    assert.equal(calcConsensus([V(2), V(2)], 0).percentage, 100);
    assert.equal(calcConsensus([V(-9), V(1)], 0).percentage, 50);
  });
});

describe("calcVoteWeight", () => {
  test("zero reputation is the baseline 1.0", () => {
    assert.equal(calcVoteWeight(0), 1.0);
  });

  test("1000 reputation adds 0.5", () => {
    assert.equal(calcVoteWeight(1000), 1.5);
  });

  test("caps at 3.0", () => {
    assert.equal(calcVoteWeight(4000), 3.0);
    assert.equal(calcVoteWeight(1_000_000), 3.0);
  });

  test("negative or NaN reputation is treated as zero", () => {
    assert.equal(calcVoteWeight(-500), 1.0);
    assert.equal(calcVoteWeight(NaN), 1.0);
  });
});

describe("slugify", () => {
  test("lowercases and hyphenates", () => {
    assert.equal(slugify("Lelouch Lamperouge"), "lelouch-lamperouge");
  });

  test("strips punctuation", () => {
    assert.equal(slugify("Spike Spiegel!"), "spike-spiegel");
  });

  test("collapses runs of separators", () => {
    assert.equal(slugify("a   b___c"), "a-b-c");
  });

  test("trims leading and trailing hyphens", () => {
    assert.equal(slugify("  --hello--  "), "hello");
  });

  test("caps length at 100 characters", () => {
    assert.equal(slugify("x".repeat(150)).length, 100);
  });

  test("an all-punctuation name yields an empty string", () => {
    assert.equal(slugify("!!!"), "");
  });
});

describe("generateSlug", () => {
  test("without an id it is just the slugified name", () => {
    assert.equal(generateSlug("Asuka Langley"), "asuka-langley");
  });

  test("with an id it appends the first 8 characters", () => {
    assert.equal(generateSlug("Asuka", "abcdefgh-1234"), "asuka-abcdefgh");
  });
});
