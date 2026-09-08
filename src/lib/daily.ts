/**
 * "Today's character" — a deterministic daily pick.
 *
 * The point is a reason to come back every day: one file to look at, thirty
 * seconds to vote on, the same file for everyone all day. Deterministic means
 * two readers comparing notes see the same character, and it costs no storage
 * (no cron, no queue) — the date is the seed.
 *
 * Pure so the selection can be unit-tested and previewed for any date.
 */

export interface Candidate {
  id: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  /** Used only to make the pick feel varied, not to rank importance. */
  viewCount: number;
}

/** UTC day number, so the pick rolls over at the same instant worldwide. */
export function dayNumber(date: Date = new Date()): number {
  return Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 86_400_000);
}

/** A small, stable hash of a string (FNV-1a 32-bit). */
function hash(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/**
 * Pick today's character from a candidate pool.
 *
 * Deterministic per (date, pool): the same day and pool always yield the same
 * entry, and a different day almost always yields a different one. Returns null
 * for an empty pool.
 */
export function pickDailyCharacter(
  candidates: Candidate[],
  date: Date = new Date()
): { character: Candidate; day: number } | null {
  if (candidates.length === 0) return null;

  const day = dayNumber(date);
  // Sort by id first so the result does not depend on query order.
  const pool = [...candidates].sort((a, b) => a.id.localeCompare(b.id));
  const index = hash(`${day}:${pool.length}`) % pool.length;

  return { character: pool[index], day };
}

/** Midnight UTC of the next rollover, so the UI can say when it changes. */
export function nextRollover(date: Date = new Date()): Date {
  const next = new Date(date);
  next.setUTCHours(24, 0, 0, 0);
  return next;
}
