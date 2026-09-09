/**
 * Unit tests for the deterministic daily pick.
 *
 * Run: npm test
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { pickDailyCharacter, dayNumber, nextRollover, type Candidate } from "../src/lib/daily.ts";

const C = (id: string): Candidate => ({ id, slug: id, name: id, imageUrl: null, viewCount: 0 });
const POOL = [C("a"), C("b"), C("c"), C("d"), C("e")];

describe("dayNumber", () => {
  test("is stable within a UTC day", () => {
    assert.equal(dayNumber(new Date("2026-09-08T00:00:00Z")), dayNumber(new Date("2026-09-08T23:59:59Z")));
  });

  test("increments across a UTC day boundary", () => {
    assert.equal(
      dayNumber(new Date("2026-09-09T00:00:00Z")) - dayNumber(new Date("2026-09-08T00:00:00Z")),
      1
    );
  });

  test("uses UTC, not local time", () => {
    // Two instants either side of UTC midnight must differ even if they fall in
    // the same local day somewhere.
    assert.notEqual(dayNumber(new Date("2026-09-08T23:00:00Z")), dayNumber(new Date("2026-09-09T01:00:00Z")));
  });
});

describe("pickDailyCharacter", () => {
  test("is deterministic for the same day and pool", () => {
    const d = new Date("2026-09-08T12:00:00Z");
    const first = pickDailyCharacter(POOL, d);
    const second = pickDailyCharacter(POOL, d);
    assert.equal(first?.character.id, second?.character.id);
  });

  test("does not depend on the order of the input pool", () => {
    const d = new Date("2026-09-08T12:00:00Z");
    const shuffled = [POOL[3], POOL[0], POOL[4], POOL[1], POOL[2]];
    assert.equal(
      pickDailyCharacter(POOL, d)?.character.id,
      pickDailyCharacter(shuffled, d)?.character.id
    );
  });

  test("changes across days (almost always)", () => {
    const picks = new Set<string>();
    for (let i = 0; i < 30; i++) {
      const d = new Date(Date.UTC(2026, 8, 1 + i));
      const p = pickDailyCharacter(POOL, d);
      if (p) picks.add(p.character.id);
    }
    // With 5 candidates over 30 days we should not see a single repeated value.
    assert.ok(picks.size >= 3, `only saw ${picks.size} distinct picks`);
  });

  test("an empty pool returns null instead of throwing", () => {
    assert.equal(pickDailyCharacter([], new Date()), null);
  });

  test("a single-candidate pool always returns it", () => {
    const p = pickDailyCharacter([C("only")], new Date("2026-09-08T00:00:00Z"));
    assert.equal(p?.character.id, "only");
  });

  test("reports the day it used", () => {
    const d = new Date("2026-09-08T00:00:00Z");
    assert.equal(pickDailyCharacter(POOL, d)?.day, dayNumber(d));
  });
});

describe("nextRollover", () => {
  test("is the next UTC midnight", () => {
    const next = nextRollover(new Date("2026-09-08T15:30:00Z"));
    assert.equal(next.toISOString(), "2026-09-09T00:00:00.000Z");
  });

  test("from exactly midnight it still moves forward", () => {
    const next = nextRollover(new Date("2026-09-08T00:00:00Z"));
    assert.equal(next.toISOString(), "2026-09-09T00:00:00.000Z");
  });
});
