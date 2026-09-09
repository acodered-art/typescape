/**
 * Offline mutation queue.
 *
 * The daily loop is the reason to open the app, and it has to work on a train.
 * A vote cast with no connection is queued in `localStorage` and replayed when
 * the network returns.
 *
 * Design constraints:
 *   - **Idempotent replay.** Each queued vote carries the value it wants, not a
 *     delta, so replaying twice lands the same state. The server's toggle
 *     semantics would flip a vote on a double-send, so a queued op also records
 *     the value it observed at queue time and is dropped if the server already
 *     agrees.
 *   - **Bounded.** A failed op is retried a few times then dropped, so a broken
 *     endpoint cannot grow the queue forever.
 *   - **Ordered.** Replay is FIFO so a later change supersedes an earlier one.
 *   - **Survivable.** The queue is plain JSON in one storage key; a corrupt
 *     entry is discarded rather than crashing the app.
 *
 * Pure logic (add/flush decisions) is separated from the browser storage so it
 * can be unit-tested without a DOM.
 */

export type QueuedVote = {
  /** Client-generated id so an op can be removed precisely. */
  id: string;
  kind: "typing-vote";
  typingId: string;
  voteValue: 1 | -1;
  /** Server state when the user acted, used to skip a no-op replay. */
  seenVote: 1 | -1 | null;
  /** Epoch ms, for ordering and human-readable diagnostics. */
  queuedAt: number;
  attempts: number;
};

export const STORAGE_KEY = "typescape.outbox.v1";
const MAX_ATTEMPTS = 4;

/* ── pure helpers ─────────────────────────────────────────── */

export function enqueue(queue: QueuedVote[], op: Omit<QueuedVote, "id" | "queuedAt" | "attempts">): QueuedVote[] {
  // Collapse a pending vote for the same reading: the newest intent wins.
  const withoutPrev = queue.filter((q) => !(q.kind === op.kind && q.typingId === op.typingId));
  return [
    ...withoutPrev,
    {
      ...op,
      id: `${op.typingId}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
      queuedAt: Date.now(),
      attempts: 0,
    },
  ];
}

/** Drop an op by id (it succeeded, or the user undid it). */
export function dequeue(queue: QueuedVote[], id: string): QueuedVote[] {
  return queue.filter((q) => q.id !== id);
}

/** True when replaying this op would change nothing. */
export function isNoOp(op: QueuedVote, current: 1 | -1 | null): boolean {
  return op.seenVote === current && current === op.voteValue;
}

/**
 * Record a failed attempt. Returns the new queue and whether the op was dropped
 * for exceeding the retry budget.
 */
export function recordFailure(queue: QueuedVote[], id: string): { queue: QueuedVote[]; dropped: boolean } {
  let dropped = false;
  const next = queue.flatMap((q) => {
    if (q.id !== id) return [q];
    const attempts = q.attempts + 1;
    if (attempts >= MAX_ATTEMPTS) {
      dropped = true;
      return [];
    }
    return [{ ...q, attempts }];
  });
  return { queue: next, dropped };
}

/* ── storage (browser only) ───────────────────────────────── */

export function loadQueue(): QueuedVote[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Discard anything that does not look like an op.
    return parsed.filter(
      (q): q is QueuedVote =>
        q && typeof q.id === "string" && q.kind === "typing-vote" &&
        typeof q.typingId === "string" && (q.voteValue === 1 || q.voteValue === -1)
    );
  } catch {
    return [];
  }
}

export function saveQueue(queue: QueuedVote[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch {
    /* quota or private mode: the vote is lost rather than the page broken */
  }
}
