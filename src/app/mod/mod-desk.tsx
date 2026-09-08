"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Btn, EmptySlot, PageTitle, Sheet, TabStrip, FolderTab, Typed } from "@/components/dossier";
import { FormNote, Modal } from "@/components/dossier/modal";
import { fetchWithCsrf } from "@/lib/csrf-client";

/**
 * The moderation desk.
 *
 * A review queue plus the direct content actions. The queue is the normal path —
 * the moderation assist files items and a human decides. The comment actions
 * exist for anything a moderator spots themselves.
 *
 * Deliberately shows the flagged content inline: a queue that only shows an ID
 * forces a moderator to open six tabs to make one judgement, which is how queues
 * go unreviewed.
 */

type QueueStatus = "pending" | "approved" | "rejected" | "all";

interface QueueComment {
  id: string;
  body: string;
  isRemoved: boolean;
  createdAt: string;
  user: { username: string; role: string; status: string };
  profile: { slug: string; name: string };
}

interface QueueItem {
  id: string;
  contentType: string;
  contentId: string;
  reason: string | null;
  status: string;
  createdAt: string;
  reviewedAt: string | null;
  flagger: { username: string } | null;
  reviewer: { username: string } | null;
  comment: QueueComment | null;
}

/** "auto:harassment,slur" reads as the rules that fired. */
function ruleNames(reason: string | null): string {
  if (!reason) return "flagged";
  const m = reason.match(/^auto:(.+?)(?:\s|$)/);
  return m ? m[1].split(",").join(", ") : reason;
}

const TABS: { key: QueueStatus; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "rejected", label: "Rejected" },
  { key: "approved", label: "Approved" },
  { key: "all", label: "All" },
];

export function ModDesk({ pendingCount }: { pendingCount: number }) {
  const [status, setStatus] = useState<QueueStatus>("pending");
  const [items, setItems] = useState<QueueItem[]>([]);
  const [count, setCount] = useState(pendingCount);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<QueueItem | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = useCallback(async (s: QueueStatus) => {
    try {
      const res = await fetch(`/api/mod/queue?status=${s}`);
      if (res.ok) {
        const d = await res.json();
        setItems(d.data ?? []);
        setCount(d.meta?.pendingCount ?? 0);
      }
    } catch {
      /* leave the previous list in place */
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch when the tab changes. `loading` flips inside the async body rather
  // than synchronously in the effect, which would cascade a render.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await load(status);
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [status, load]);

  const decide = async (item: QueueItem, decision: "approve" | "reject", reason?: string) => {
    setBusy(item.id);
    setNote("");
    try {
      const res = await fetchWithCsrf("/api/mod/queue", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, decision, reason }),
      });
      const d = await res.json();
      if (!res.ok) {
        setNote(d.error || "That did not go through.");
        return;
      }
      setCount(d.meta?.pendingCount ?? count);
      await load(status);
    } catch {
      setNote("Network error.");
    } finally {
      setBusy(null);
      setRejecting(null);
      setRejectReason("");
    }
  };

  const commentAction = async (commentId: string, action: string) => {
    setBusy(commentId);
    setNote("");
    try {
      const res = await fetchWithCsrf(`/api/mod/comments/${commentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const d = await res.json();
      if (!res.ok) setNote(d.error || "That did not go through.");
      else await load(status);
    } catch {
      setNote("Network error.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col gap-5 pb-10">
      <PageTitle
        title="Moderation"
        aside={count > 0 ? `${count} waiting` : "Nothing waiting"}
      />

      <TabStrip>
        {TABS.map((t) => (
          <FolderTab key={t.key} active={status === t.key} onClick={() => setStatus(t.key)}>
            {t.label}
            {t.key === "pending" && count > 0 ? ` (${count})` : ""}
          </FolderTab>
        ))}
      </TabStrip>

      {note && <FormNote error>{note}</FormNote>}

      {loading ? (
        <Typed>Opening the queue.</Typed>
      ) : items.length === 0 ? (
        <Sheet className="p-5">
          <EmptySlot label={`Nothing ${status === "all" ? "" : status} in the queue.`}>{null}</EmptySlot>
        </Sheet>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <Sheet key={item.id} className="flex flex-col gap-3 p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="font-display text-[18px] font-extrabold uppercase tracking-[0.08em]">
                    {item.contentType}
                  </span>
                  <span className="font-typed text-[12px] text-navy">
                    {ruleNames(item.reason)}
                  </span>
                  {item.status !== "pending" && (
                    <span className="border border-steel px-1.5 font-typed text-[11px] uppercase">
                      {item.status}
                    </span>
                  )}
                </div>
                <span className="font-typed text-[11px] text-steel-2">
                  {new Date(item.createdAt).toISOString().slice(0, 16).replace("T", " ")} UTC
                </span>
              </div>

              {item.comment ? (
                <div className="border-l-2 border-steel pl-3">
                  <div className="flex flex-wrap items-baseline gap-2 font-typed text-[12px]">
                    <Link href={`/user/${item.comment.user.username}`} className="text-blue underline">
                      {item.comment.user.username}
                    </Link>
                    <span className="text-steel-2">on</span>
                    <Link href={`/profiles/${item.comment.profile.slug}`} className="text-blue underline">
                      {item.comment.profile.name}
                    </Link>
                    {item.comment.user.role !== "user" && (
                      <span className="border border-navy px-1 text-[10px] uppercase">{item.comment.user.role}</span>
                    )}
                    {item.comment.isRemoved && (
                      <span className="border border-navy px-1 text-[10px] uppercase">removed</span>
                    )}
                  </div>
                  <p className="mt-1 max-w-[70ch] text-[14px] leading-[1.55]">{item.comment.body}</p>
                </div>
              ) : (
                <Typed className="text-[13px] text-navy">
                  Content is no longer available (it may have been deleted).
                </Typed>
              )}

              {item.status === "pending" ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Btn
                    variant="primary"
                    onClick={() => void decide(item, "approve")}
                    disabled={busy === item.id}
                  >
                    Approve
                  </Btn>
                  <Btn
                    variant="secondary"
                    onClick={() => setRejecting(item)}
                    disabled={busy === item.id}
                  >
                    Reject
                  </Btn>
                  {item.comment && !item.comment.isRemoved && (
                    <Btn
                      variant="small"
                      onClick={() => void commentAction(item.comment!.id, "remove")}
                      disabled={busy === item.comment.id}
                      title="Remove the comment without closing the queue item"
                    >
                      Remove comment
                    </Btn>
                  )}
                </div>
              ) : (
                <Typed className="text-[12px] text-navy">
                  {item.reviewer ? `Decided by ${item.reviewer.username}` : "Decided"}
                  {item.reviewedAt ? ` · ${new Date(item.reviewedAt).toISOString().slice(0, 16).replace("T", " ")}` : ""}
                </Typed>
              )}

              {item.comment && item.status !== "pending" && (
                <div className="flex flex-wrap gap-2">
                  <Btn
                    variant="small"
                    onClick={() =>
                      void commentAction(item.comment!.id, item.comment!.isRemoved ? "restore" : "remove")
                    }
                    disabled={busy === item.comment.id}
                  >
                    {item.comment.isRemoved ? "Restore comment" : "Remove comment"}
                  </Btn>
                </div>
              )}
            </Sheet>
          ))}
        </div>
      )}

      <p className="max-w-[70ch] font-typed text-[12px] leading-[1.6] text-navy">
        Approving a held item publishes it. Rejecting leaves it unpublished and marks the
        comment removed — the author can still see it and it stays in the thread rather than
        vanishing. Both decisions are recorded in the audit log with your name.
      </p>

      <Modal open={!!rejecting} onClose={() => setRejecting(null)} title="Reject this item">
        <div className="flex flex-col gap-3">
          <Typed className="text-[13px] leading-[1.5]">
            Give the author a reason. It is shown alongside the removed comment and stored in
            the audit log.
          </Typed>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Stereotyping, not a reading of the character."
            className="w-full border border-steel bg-paper px-2 py-1 font-body text-[14px] text-ink outline-none focus:border-blue"
          />
          <div className="flex gap-2">
            <Btn
              variant="primary"
              onClick={() => rejecting && void decide(rejecting, "reject", rejectReason)}
              disabled={!rejectReason.trim() || busy === rejecting?.id}
            >
              Reject and remove
            </Btn>
            <Btn variant="secondary" onClick={() => setRejecting(null)}>Cancel</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}
