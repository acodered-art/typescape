/**
 * Unit tests for the moderation assist.
 *
 * Run: npm test
 *
 * Two properties matter: blocking content is held, and ordinary discussion is
 * never held (a false positive silences a real reader).
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { moderate } from "../src/lib/moderation.ts";

describe("moderate", () => {
  test("ordinary discussion is clean", () => {
    const v = moderate("I think INFP fits better given the way he handles conflict.");
    assert.equal(v.severity, "info");
    assert.equal(v.hold, false);
    assert.equal(v.flags.length, 0);
    assert.equal(v.risk, 0);
  });

  test("empty input is clean and does not throw", () => {
    const v = moderate("");
    assert.equal(v.hold, false);
    assert.equal(v.risk, 0);
  });

  test("a slur blocks and is held", () => {
    const v = moderate("what a r3tard take");
    assert.equal(v.severity, "block");
    assert.equal(v.hold, true);
    assert.ok(v.flags.some((f) => f.rule === "slur"));
  });

  test("direct harassment blocks", () => {
    const v = moderate("you are an idiot for thinking that");
    assert.equal(v.hold, true);
    assert.ok(v.flags.some((f) => f.rule === "harassment"));
  });

  test("a threat blocks", () => {
    const v = moderate("I will kill you if you keep posting this");
    assert.equal(v.hold, true);
    assert.ok(v.flags.some((f) => f.rule === "threat"));
  });

  test("self-harm content blocks", () => {
    const v = moderate("honestly sometimes I just want to kill myself over this show");
    assert.equal(v.hold, true);
    assert.ok(v.flags.some((f) => f.rule === "self-harm"));
  });

  test("stereotyping warns but does not hold", () => {
    const v = moderate("every INFP is like this honestly");
    assert.equal(v.severity, "warn");
    assert.equal(v.hold, false);
    assert.ok(v.flags.some((f) => f.rule === "stereotyping"));
  });

  test("declaring a type superior warns", () => {
    const v = moderate("INTJs are the best type, no contest");
    assert.equal(v.severity, "warn");
    assert.equal(v.hold, false);
  });

  test("diagnosing a real person warns", () => {
    const v = moderate("that guy clearly has bpd");
    assert.equal(v.severity, "warn");
    assert.equal(v.hold, false);
    assert.ok(v.flags.some((f) => f.rule === "clinical-claim"));
  });

  test("gatekeeping warns", () => {
    const v = moderate("you're not an INFP, you're fake");
    assert.equal(v.severity, "warn");
    assert.equal(v.hold, false);
  });

  test("shouting alone is info, never a hold", () => {
    const v = moderate("THIS CHARACTER IS ABSOLUTELY AN ENFP FOR SURE");
    assert.equal(v.severity, "info");
    assert.equal(v.hold, false);
    assert.ok(v.flags.some((f) => f.rule === "shouting"));
  });

  test("short all-caps does not trip the shouting rule", () => {
    const v = moderate("OK YES");
    assert.equal(v.flags.some((f) => f.rule === "shouting"), false);
  });

  test("zero-width characters cannot hide a slur", () => {
    const v = moderate("r\u200B3\u200Btard");
    assert.equal(v.hold, true);
  });

  test("risk is capped at 100", () => {
    const v = moderate("you are an idiot r3tard I will kill you kill myself");
    assert.ok(v.risk <= 100);
    assert.equal(v.hold, true);
  });

  test("every flag explains itself", () => {
    const v = moderate("every INFP is like this");
    for (const f of v.flags) {
      assert.ok(f.note.length > 0, `${f.rule} has no note`);
      assert.ok(f.match.length > 0, `${f.rule} has no match`);
    }
  });
});
