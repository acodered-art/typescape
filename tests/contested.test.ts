/**
 * Unit tests for contested-reading detection.
 *
 * Run: npm test
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { detectContested } from "../src/lib/contested.ts";

const V = (voteValue: number, weight = 1) => ({ voteValue, weight });
const E = (voteCount: number) => ({ voteCount });

describe("detectContested", () => {
  test("too few voters is never contested", () => {
    const r = detectContested({ votes: [V(1), V(-1)], evidence: [E(-5)] });
    assert.equal(r.contested, false);
    assert.equal(r.voterCount, 2);
  });

  test("a unanimous read is not contested", () => {
    const r = detectContested({
      votes: [V(1), V(1), V(1), V(1)],
      evidence: [E(2)],
    });
    assert.equal(r.contested, false);
    assert.equal(r.voteMargin, 1);
  });

  test("a dead-heat split is contested", () => {
    const r = detectContested({
      votes: [V(1), V(1), V(-1), V(-1)],
      evidence: [],
    });
    assert.equal(r.contested, true);
    assert.equal(r.voteMargin, 0);
    assert.match(r.reason, /vote is split/);
  });

  test("a holding read with negative evidence is contested", () => {
    const r = detectContested({
      votes: [V(1), V(1), V(1), V(-1)],
      evidence: [E(-4), E(-2), E(1)],
    });
    assert.equal(r.contested, true);
    assert.match(r.reason, /evidence leans against/);
    assert.equal(r.negativeEvidence, 2);
    assert.equal(r.positiveEvidence, 1);
  });

  test("a holding read with supportive evidence is not contested", () => {
    const r = detectContested({
      votes: [V(1), V(1), V(1), V(1)],
      evidence: [E(3), E(1)],
    });
    assert.equal(r.contested, false);
    assert.equal(r.reason, "");
  });

  test("weight is respected in the margin", () => {
    // 3 light upvotes vs 1 heavy downvote: 3 vs 5 → margin -0.25. That is
    // outside the 0.2 split band, so the read still counts as holding — the
    // point is that weight changed the margin, not the voter count.
    const heavy = detectContested({ votes: [V(1), V(1), V(1), V(-1, 5)], evidence: [] });
    assert.equal(heavy.voteMargin, -0.25);
    assert.equal(heavy.contested, false);
    assert.equal(heavy.voterCount, 4);

    // Same votes with weight 2: 3 vs 2 → margin +0.2, which is the split band.
    const close = detectContested({ votes: [V(1), V(1), V(1), V(-1, 2)], evidence: [] });
    assert.equal(close.voteMargin, 0.2);
    assert.equal(close.contested, true);
  });

  test("equal supportive and negative evidence does not tip the verdict", () => {
    const r = detectContested({
      votes: [V(1), V(1), V(1), V(1)],
      evidence: [E(-3), E(3)],
    });
    assert.equal(r.contested, false);
  });

  test("an empty vote list is safe", () => {
    const r = detectContested({ votes: [], evidence: [] });
    assert.equal(r.contested, false);
    assert.equal(r.voteMargin, 0);
  });
});
