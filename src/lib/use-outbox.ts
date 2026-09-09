"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  loadQueue,
  saveQueue,
  enqueue,
  dequeue,
  recordFailure,
  type QueuedVote,
} from "@/lib/outbox";
import { fetchWithCsrf } from "@/lib/csrf-client";

/**
 * Offline-capable vote submission.
 *
 * A vote is applied to local state immediately, then either sent or queued. The
 * queue replays on reconnect and on a slow timer, so a vote cast on the subway
 * lands without the reader doing anything.
 *
 * Returns the pending count so the UI can say "2 votes waiting to send" rather
 * than pretending everything is saved.
 */
export function useOutbox() {
  // Initialise lazily from storage so the first render already knows what is
  // pending; an effect that setState-s on mount would cause a cascading render.
  const [queue, setQueue] = useState<QueuedVote[]>(() => loadQueue());
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine
  );
  const flushing = useRef(false);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  const persist = useCallback((next: QueuedVote[]) => {
    setQueue(next);
    saveQueue(next);
  }, []);

  const flush = useCallback(async () => {
    if (flushing.current) return;
    flushing.current = true;
    try {
      for (const op of loadQueue()) {
        // The op records the value the user saw when they acted, so a duplicate
        // send of the same intent is skipped rather than toggling the vote off.
        try {
          const res = await fetchWithCsrf(`/api/typings/${op.typingId}/vote`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ voteValue: op.voteValue }),
          });

          if (res.ok) {
            persist(dequeue(loadQueue(), op.id));
            window.dispatchEvent(new Event("typescape:votes"));
            continue;
          }

          // 401/403/404 will never succeed on retry — drop it.
          if ([400, 401, 403, 404, 422].includes(res.status)) {
            persist(dequeue(loadQueue(), op.id));
            continue;
          }

          const { queue: next, dropped } = recordFailure(loadQueue(), op.id);
          persist(next);
          if (dropped) continue;
        } catch {
          // Network failure: keep it for the next attempt.
          const { queue: next } = recordFailure(loadQueue(), op.id);
          persist(next);
          break; // stop the loop; the network is down
        }
      }
    } finally {
      flushing.current = false;
    }
  }, [persist]);

  // Replay on reconnect and every 30s while anything is pending.
  useEffect(() => {
    if (online && queue.length > 0) void flush();
  }, [online, queue.length, flush]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (loadQueue().length > 0) void flush();
    }, 30_000);
    return () => window.clearInterval(id);
  }, [flush]);

  /** Queue or send a vote. Returns whether it went out immediately. */
  const vote = useCallback(
    async (typingId: string, voteValue: 1 | -1, seenVote: 1 | -1 | null): Promise<boolean> => {
      // Nothing to do if the server already reflects this intent.
      if (seenVote === voteValue) return true;

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        persist(enqueue(loadQueue(), { kind: "typing-vote", typingId, voteValue, seenVote }));
        return false;
      }

      try {
        const res = await fetchWithCsrf(`/api/typings/${typingId}/vote`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ voteValue }),
        });
        if (res.ok) {
          window.dispatchEvent(new Event("typescape:votes"));
          return true;
        }
        if (res.status === 429) {
          persist(enqueue(loadQueue(), { kind: "typing-vote", typingId, voteValue, seenVote }));
          return false;
        }
        return false;
      } catch {
        persist(enqueue(loadQueue(), { kind: "typing-vote", typingId, voteValue, seenVote }));
        return false;
      }
    },
    [persist]
  );

  return { vote, flush, pending: queue.length, online };
}
