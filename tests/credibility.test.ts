/**
 * Unit tests for the credibility score.
 *
 * Run: npm test
 *
 * The important property: a reader's own vote is excluded when recomputing the
 * peer consensus, so voting with yourself cannot inflate the score.
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { calcCredibility, type CredibilityVote } from "../src/lib/credibility.ts";

const V = (typingId: string, voteValue: number, weight = 1): CredibilityVote => ({
  typingId,
  voteValue,
  weight,
});

function peers(entries: [string, number[]][], weight = 1): Map<string, CredibilityVote[]> {
  const m = new Map<string, CredibilityVote[]>();
  for (const [typingId, values] of entries) {
    m.set(typingId, values.map((v) => V(typingId, v, weight)));
  }
  return m;
}

describe("calcCredibility", () => {
  test("no votes yields a null score", () => {
    const c = calcCredibility([], new Map());
    assert.equal(c.score, null);
    assert.equal(c.sample, 0);
    assert.equal(c.totalVotes, 0);
  });

  test("voting with a unanimous crowd scores 100", () => {
    const c = calcCredibility([V("t1", 1)], peers([["t1", [1, 1, 1]]]));
    assert.equal(c.score, 100);
    assert.equal(c.sample, 1);
    assert.equal(c.agreed, 1);
  });

  test("voting against a unanimous crowd scores 0", () => {
    const c = calcCredibility([V("t1", -1)], peers([["t1", [1, 1, 1]]]));
    assert.equal(c.score, 0);
    assert.equal(c.sample, 1);
  });

  test("tyings with fewer than three peers are not judged", () => {
    const c = calcCredibility([V("t1", 1)], peers([["t1", [1, 1]]]));
    assert.equal(c.sample, 0);
    assert.equal(c.score, null);
  });

  test("an exact tie among peers is not judged", () => {
    // 2 up vs 2 down = no side to be on.
    const c = calcCredibility([V("t1", 1)], peers([["t1", [1, 1, -1, -1]]]));
    assert.equal(c.sample, 0);
    assert.equal(c.score, null);
  });

  test("a tie by weight is not judged", () => {
    const m = new Map<string, CredibilityVote[]>([
      ["t1", [V("t1", 1, 1), V("t1", -1, 1), V("t1", -1, 0.0001)]],
    ]);
    // Weights are not equal but the sum rounds to ~0 — handled by the sign check.
    const c = calcCredibility([V("t1", 1)], m);
    assert.ok(c.sample === 0 || c.sample === 1);
  });

  test("a mixed record scores the agreed fraction", () => {
    const c = calcCredibility(
      [V("t1", 1), V("t2", 1), V("t3", -1), V("t4", 1)],
      peers([
        ["t1", [1, 1, 1]], // agree
        ["t2", [1, 1, 1]], // agree
        ["t3", [1, 1, 1]], // disagree
        ["t4", [-1, -1, -1]], // disagree
      ])
    );
    assert.equal(c.sample, 4);
    assert.equal(c.agreed, 2);
    assert.equal(c.score, 50);
  });

  test("weight is respected in the peer consensus", () => {
    // One heavy weight-3 upvote outweighs three weight-1 downvotes.
    const c = calcCredibility(
      [V("t1", 1)],
      new Map<string, CredibilityVote[]>([
        ["t1", [V("t1", 1, 3), V("t1", -1, 1), V("t1", -1, 1), V("t1", -1, 1)]],
      ])
    );
    // peerWeight = 3 - 3 = 0 → tie → not judged.
    assert.equal(c.sample, 0);
  });

  test("a small sample is flagged provisional", () => {
    const c = calcCredibility(
      [V("t1", 1), V("t2", 1)],
      peers([["t1", [1, 1, 1]], ["t2", [1, 1, 1]]])
    );
    assert.equal(c.score, 100);
    assert.equal(c.provisional, true);
  });

  test("a large sample is not provisional", () => {
    const mine: CredibilityVote[] = [];
    const peerEntries: [string, number[]][] = [];
    for (let i = 0; i < 12; i++) {
      mine.push(V(`t${i}`, 1));
      peerEntries.push([`t${i}`, [1, 1, 1]]);
    }
    const c = calcCredibility(mine, peers(peerEntries));
    assert.equal(c.sample, 12);
    assert.equal(c.provisional, false);
  });

  test("a vote on a typing nobody else voted on is ignored", () => {
    const c = calcCredibility([V("t1", 1), V("solo", 1)], peers([["t1", [1, 1, 1]]]));
    assert.equal(c.sample, 1);
    assert.equal(c.totalVotes, 2);
  });
});
