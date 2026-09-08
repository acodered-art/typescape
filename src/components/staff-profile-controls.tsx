"use client";
import { useState } from "react";
import { Btn, Sheet, Typed } from "@/components/dossier";
import { FormNote, Modal } from "@/components/dossier/modal";
import { fetchWithCsrf } from "@/lib/csrf-client";
import { can, isStaff } from "@/lib/permissions";

/**
 * Staff controls on a character file: lock / unlock, with a mandatory reason.
 *
 * Rendered only for staff, and only the actions their role actually holds — the
 * server enforces the same thing, this just avoids showing a button that will
 * always fail. Locking is the one destructive action here, so it asks for a
 * reason in a dialog rather than firing on a single click.
 */
export function StaffProfileControls({
  slug,
  isLocked,
  role,
}: {
  slug: string;
  isLocked: boolean;
  role: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [err, setErr] = useState(false);
  const [locked, setLocked] = useState(isLocked);

  if (!isStaff(role) || !can(role, "profile.lock")) return null;

  const submit = async (action: "lock" | "unlock") => {
    setBusy(true);
    setNote("");
    try {
      const res = await fetchWithCsrf(`/api/mod/profiles/${encodeURIComponent(slug)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason: reason.trim() || undefined }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(true);
        setNote(d.error || "That did not go through.");
        return;
      }
      setLocked(action === "lock");
      setOpen(false);
      setReason("");
      setErr(false);
      setNote(action === "lock" ? "File locked." : "File unlocked.");
    } catch {
      setErr(true);
      setNote("Network error.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Sheet className="flex flex-wrap items-center justify-between gap-3 p-3">
        <div className="flex flex-col">
          <span className="lab">Staff</span>
          <Typed className="text-sm text-navy">
            {locked ? "This file is locked to new readings and comments." : "This file is open."}
          </Typed>
        </div>
        <div className="flex items-center gap-2">
          {note && <FormNote error={err}>{note}</FormNote>}
          <Btn
            variant="small"
            onClick={() => {
              setReason("");
              setOpen(true);
            }}
          >
            {locked ? "Unlock file" : "Lock file"}
          </Btn>
        </div>
      </Sheet>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={locked ? "Unlock this file" : "Lock this file"}
      >
        <div className="flex flex-col gap-3">
          <Typed className="text-base leading-[1.5]">
            {locked
              ? "Unlocking reopens the file to new readings and comments. The staff note is cleared."
              : "A locked file still reads normally — it just refuses new readings and comments while you review it. The reason is kept as a staff note."}
          </Typed>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Typing war; leaving it to settle."
            className="w-full border border-steel bg-paper px-2 py-1 font-body text-md text-ink outline-none focus:border-blue"
          />
          <div className="flex gap-2">
            <Btn
              variant="primary"
              onClick={() => void submit(locked ? "unlock" : "lock")}
              disabled={busy || (!locked && reason.trim().length < 5)}
            >
              {busy ? "Working" : locked ? "Unlock" : "Lock"}
            </Btn>
            <Btn variant="secondary" onClick={() => setOpen(false)}>Cancel</Btn>
          </div>
        </div>
      </Modal>
    </>
  );
}
