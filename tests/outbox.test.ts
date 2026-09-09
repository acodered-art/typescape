/**
 * Unit tests for the offline mutation queue.
 *
 * Run: npm test
 *
 * The critical property: replaying a queued vote twice must not flip it. The
 * server toggles on the same value, so the queue has to be idempotent on its
 * own terms.
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  enqueue,
  dequeue,
  isNoOp,
  recordFailure,
  type QueuedVote,
} from "../src/lib/outbox.ts";

const OP = { kind: "typing-vote" as const, typingId: "t1", voteValue: 1 as const, seenVote: null };

describe("enqueue", () => {
  test("adds an op with a generated id and timestamp", () => {
    const q = enqueue([], OP);
    assert.equal(q.length, 1);
    assert.equal(q[0].typingId, "t1");
    assert.equal(q[0].attempts, 0);
    assert.ok(q[0].id.length > 0);
    assert.ok(q[0].queuedAt > 0);
  });

  test("a newer vote for the same reading replaces the pending one", () => {
    let q = enqueue([], { ...OP, voteValue: 1 });
    q = enqueue(q, { ...OP, voteValue: -1 });
    assert.equal(q.length, 1, "should collapse to one intent per reading");
    assert.equal(q[0].voteValue, -1);
  });

  test("different readings queue independently", () => {
    let q = enqueue([], OP);
    q = enqueue(q, { ...OP, typingId: "t2", voteValue: -1 });
    assert.equal(q.length, 2);
  });

  test("ids are unique across rapid enqueues", () => {
    let q: QueuedVote[] = [];
    for (let i = 0; i < 200; i++) q = enqueue(q, { ...OP, typingId: `t${i}` });
    assert.equal(new Set(q.map((o) => o.id)).size, 200);
  });
});

describe("dequeue", () => {
  test("removes by id and leaves the rest", () => {
    const q = enqueue(enqueue([], OP), { ...OP, typingId: "t2" });
    const after = dequeue(q, q[0].id);
    assert.equal(after.length, 1);
    assert.equal(after[0].typingId, "t2");
  });

  test("an unknown id is a no-op", () => {
    const q = enqueue([], OP);
    assert.equal(dequeue(q, "nope").length, 1);
  });
});

describe("isNoOp", () => {
  test("true when the server already matches the queued intent", () => {
    const op: QueuedVote = { ...OP, id: "x", queuedAt: 0, attempts: 0, seenVote: 1 };
    assert.equal(isNoOp(op, 1), true);
  });

  test("false when the server state differs", () => {
    const op: QueuedVote = { ...OP, id: "x", queuedAt: 0, attempts: 0, seenVote: null };
    assert.equal(isNoOp(op, null), false);
  });

  test("false when the user changed their mind", () => {
    // queued -1 but the server already reads -1 means nothing to send
    const op: QueuedVote = { ...OP, voteValue: -1, id: "x", queuedAt: 0, attempts: 0, seenVote: -1 };
    assert.equal(isNoOp(op, -1), true);
  });
});

describe("recordFailure", () => {
  test("increments attempts and keeps the op", () => {
    const q = enqueue([], OP);
    const { queue, dropped } = recordFailure(q, q[0].id);
    assert.equal(dropped, false);
    assert.equal(queue[0].attempts, 1);
  });

  test("drops the op after the retry budget is exhausted", () => {
    let q = enqueue([], OP);
    const id = q[0].id;
    let dropped = false;
    for (let i = 0; i < 5 && !dropped; i++) {
      const r = recordFailure(q, id);
      q = r.queue;
      dropped = r.dropped;
    }
    assert.equal(dropped, true, "should eventually drop rather than grow forever");
    assert.equal(q.length, 0);
  });

  test("other ops are untouched", () => {
    const q = enqueue(enqueue([], OP), { ...OP, typingId: "t2" });
    const { queue } = recordFailure(q, q[0].id);
    assert.equal(queue.length, 2);
    assert.equal(queue.find((o) => o.typingId === "t2")?.attempts, 0);
  });
});
