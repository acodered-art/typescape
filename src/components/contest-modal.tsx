"use client";
import { useState } from "react";
import { Btn, Typed } from "@/components/dossier";
import { FormNote, Modal, SelectPaper } from "@/components/dossier/modal";
import { fetchWithCsrf } from "@/lib/csrf-client";

/**
 * Contest a reading with an argument instead of a bare downvote.
 *
 * The reason is mandatory (the endpoint enforces 20+ characters) because a
 * downvote with no argument is exactly the behaviour that lets a stale
 * plurality persist. Filing a contest also registers disagreement.
 */
export function ContestModal({
  typingId,
  readingLabel,
  open,
  onClose,
  onFiled,
}: {
  typingId: string;
  readingLabel: string;
  open: boolean;
  onClose: () => void;
  onFiled?: () => void;
}) {
  const [reason, setReason] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceLabel, setSourceLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (reason.trim().length < 20) {
      setError("Give a reason of at least 20 characters.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetchWithCsrf(`/api/typings/${typingId}/contest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: reason.trim(),
          sourceUrl: sourceUrl.trim() || undefined,
          sourceLabel: sourceLabel.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(res.status === 401 ? "Sign in to contest a reading." : data.error || "Could not file that.");
        return;
      }
      setDone(true);
      onFiled?.();
    } catch {
      setError("Network error — try again.");
    } finally {
      setLoading(false);
    }
  };

  const close = () => {
    setReason("");
    setSourceUrl("");
    setSourceLabel("");
    setError("");
    setDone(false);
    onClose();
  };

  return (
    <Modal open={open} onClose={close} title={`Contest: ${readingLabel}`}>
      {done ? (
        <div className="flex flex-col gap-3">
          <Typed>
            Filed. Your argument now sits with the evidence and shows the reading as contested.
          </Typed>
          <div>
            <Btn variant="primary" onClick={close}>Close</Btn>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <Typed className="text-base leading-[1.5]">
            Say why this reading is wrong and cite where you know it from. A bare downvote is
            not enough — the argument is the point.
          </Typed>
          <label className="flex flex-col gap-1">
            <span className="lab">Your reason</span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="In chapter 12 he explicitly refuses to…"
              className="w-full border border-steel bg-paper px-2 py-1 font-body text-md text-ink outline-none focus:border-blue"
            />
            <span className="text-right font-typed text-xs text-steel-2">
              {reason.length}/2000
            </span>
          </label>
          <label className="flex flex-col gap-1">
            <span className="lab">Source URL (optional)</span>
            <input
              type="url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://…"
              className="w-full border border-steel bg-paper px-2 py-1 font-typed text-base text-ink outline-none focus:border-blue"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="lab">Source label (optional)</span>
            <input
              type="text"
              value={sourceLabel}
              onChange={(e) => setSourceLabel(e.target.value)}
              maxLength={100}
              placeholder="Volume 3, page 44"
              className="w-full border border-steel bg-paper px-2 py-1 font-body text-md text-ink outline-none focus:border-blue"
            />
          </label>
          {error && <FormNote error>{error}</FormNote>}
          <div className="flex items-center gap-3">
            <Btn variant="primary" onClick={submit} disabled={loading}>
              {loading ? "Filing" : "File the contest"}
            </Btn>
            <Btn variant="secondary" onClick={close}>Cancel</Btn>
          </div>
        </div>
      )}
    </Modal>
  );
}

/** Small helper the panel uses to name the reading in the modal title. */
export function readingLabel(systemName: string, typeValue: string): string {
  return `${systemName.replace(/\s*\(.*\)\s*$/, "")} ${typeValue}`;
}

export { SelectPaper };
