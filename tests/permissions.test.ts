/**
 * Unit tests for the staff permission model.
 *
 * Run: npm test
 *
 * The guardrails matter more than the happy path: a moderator silencing an
 * admin, or the last admin demoting themselves, are the failures that take a
 * site down.
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  can,
  isStaff,
  permissionsFor,
  checkSelfTarget,
  checkRoleChange,
  checkModerateTarget,
  validateStatusChange,
  effectiveStatus,
  canPost,
} from "../src/lib/permissions.ts";

describe("permission sets", () => {
  test("a plain user has nothing", () => {
    assert.deepEqual(permissionsFor("user"), []);
    assert.equal(can("user", "queue.view"), false);
    assert.equal(isStaff("user"), false);
  });

  test("an unknown role has nothing, rather than everything", () => {
    assert.deepEqual(permissionsFor("superuser"), []);
    assert.equal(can(null, "queue.view"), false);
    assert.equal(can(undefined, "queue.view"), false);
  });

  test("a moderator can work the queue and content", () => {
    assert.equal(can("moderator", "queue.view"), true);
    assert.equal(can("moderator", "comment.remove"), true);
    assert.equal(can("moderator", "comment.restore"), true);
    assert.equal(can("moderator", "comment.lock"), true);
  });

  test("a moderator cannot touch people or the site", () => {
    assert.equal(can("moderator", "user.ban"), false);
    assert.equal(can("moderator", "user.role"), false);
    assert.equal(can("moderator", "site.maintenance"), false);
    assert.equal(can("moderator", "audit.view"), false);
    assert.equal(can("moderator", "profile.delete"), false);
  });

  test("an admin holds every moderator permission plus the rest", () => {
    for (const p of permissionsFor("moderator")) {
      assert.equal(can("admin", p), true, `admin should hold ${p}`);
    }
    assert.equal(can("admin", "user.ban"), true);
    assert.equal(can("admin", "user.role"), true);
    assert.equal(can("admin", "audit.view"), true);
    assert.equal(can("admin", "site.maintenance"), true);
  });

  test("isStaff is true for both staff tiers only", () => {
    assert.equal(isStaff("moderator"), true);
    assert.equal(isStaff("admin"), true);
    assert.equal(isStaff("user"), false);
  });
});

describe("checkSelfTarget", () => {
  test("refuses banning or timing out yourself", () => {
    assert.equal(checkSelfTarget("u1", "u1", "user.ban").ok, false);
    assert.equal(checkSelfTarget("u1", "u1", "user.timeout").ok, false);
    assert.equal(checkSelfTarget("u1", "u1", "user.role").ok, false);
  });

  test("allows acting on someone else", () => {
    assert.equal(checkSelfTarget("u1", "u2", "user.ban").ok, true);
  });

  test("reading the queue about yourself is not blocked", () => {
    assert.equal(checkSelfTarget("u1", "u1", "queue.view").ok, true);
  });
});

describe("checkRoleChange", () => {
  test("refuses changing your own role", () => {
    assert.equal(checkRoleChange("u1", "u1", "admin", false).ok, false);
  });

  test("refuses demoting the last admin", () => {
    const r = checkRoleChange("u1", "u2", "moderator", true);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.status, 409);
  });

  test("allows demoting an admin when another remains", () => {
    assert.equal(checkRoleChange("u1", "u2", "moderator", false).ok, true);
  });

  test("allows promoting someone to admin", () => {
    assert.equal(checkRoleChange("u1", "u2", "admin", false).ok, true);
  });
});

describe("checkModerateTarget", () => {
  test("refuses moderating your own content", () => {
    assert.equal(checkModerateTarget("moderator", "u1", { userId: "u1", role: "user" }).ok, false);
  });

  test("a moderator cannot moderate an admin", () => {
    const r = checkModerateTarget("moderator", "u1", { userId: "u2", role: "admin" });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.status, 403);
  });

  test("an admin can moderate another admin", () => {
    assert.equal(checkModerateTarget("admin", "u1", { userId: "u2", role: "admin" }).ok, true);
  });

  test("a moderator can moderate a plain user", () => {
    assert.equal(checkModerateTarget("moderator", "u1", { userId: "u2", role: "user" }).ok, true);
  });
});

describe("validateStatusChange", () => {
  const now = new Date("2026-09-08T12:00:00Z");

  test("accepts an indefinite ban", () => {
    assert.equal(validateStatusChange("banned", null, now).ok, true);
  });

  test("requires an end time for a timeout", () => {
    assert.equal(validateStatusChange("timeout", null, now).ok, false);
  });

  test("requires the timeout to end in the future", () => {
    const past = new Date("2026-09-01T00:00:00Z");
    assert.equal(validateStatusChange("timeout", past, now).ok, false);
  });

  test("accepts a future timeout", () => {
    const soon = new Date("2026-09-09T00:00:00Z");
    assert.equal(validateStatusChange("timeout", soon, now).ok, true);
  });

  test("rejects an unknown status", () => {
    assert.equal(validateStatusChange("zapped", null, now).ok, false);
  });

  test("accepts clearing back to active", () => {
    assert.equal(validateStatusChange("active", null, now).ok, true);
  });
});

describe("effectiveStatus / canPost", () => {
  const now = new Date("2026-09-08T12:00:00Z");

  test("an expired timeout is treated as active", () => {
    const u = { status: "timeout", statusUntil: new Date("2026-09-01T00:00:00Z") };
    assert.equal(effectiveStatus(u, now), "active");
    assert.equal(canPost(u, now), true);
  });

  test("a live timeout blocks posting", () => {
    const u = { status: "timeout", statusUntil: new Date("2026-09-09T00:00:00Z") };
    assert.equal(effectiveStatus(u, now), "timeout");
    assert.equal(canPost(u, now), false);
  });

  test("a ban blocks posting indefinitely", () => {
    const u = { status: "banned", statusUntil: null };
    assert.equal(canPost(u, now), false);
  });

  test("an active user can post", () => {
    assert.equal(canPost({ status: "active", statusUntil: null }, now), true);
  });
});
