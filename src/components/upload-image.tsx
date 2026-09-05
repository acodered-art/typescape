"use client";
import { useState } from "react";
import { Btn, Typed } from "@/components/dossier";
import { FormNote, Modal } from "@/components/dossier/modal";

/** The control on the portrait: hover shows a typed label, the modal takes an image address for a moderator to review. */
export function UploadImageButton({ profileSlug, currentImage }: { profileSlug: string; currentImage?: string | null }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const submitted = message.startsWith("Portrait submitted");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`/api/profiles/${profileSlug}/image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: url.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage("Portrait submitted. A moderator will look at it shortly.");
        setUrl("");
        setTimeout(() => { setOpen(false); setMessage(""); window.location.reload(); }, 2000);
      } else {
        setMessage(data.error || "Failed");
      }
    } catch {
      setMessage("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="group absolute inset-0 flex items-end justify-center pb-2" title={currentImage ? "Change the portrait" : "Add a portrait"}>
        <span className="bg-ink/75 px-2 py-1 font-typed text-[11px] font-bold tracking-[0.1em] text-paper opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100">
          {currentImage ? "CHANGE" : "ADD PORTRAIT"}
        </span>
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Portrait">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Typed className="text-[14px]">Paste the address of an image. A moderator checks it before it shows on the file.</Typed>
          <label className="flex flex-col gap-1">
            <span className="lab">Image address</span>
            <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/portrait.jpg" required className="input-paper" />
          </label>
          {message && <FormNote error={!submitted}>{message}</FormNote>}
          <div className="flex justify-end gap-3 pt-2">
            <Btn onClick={() => setOpen(false)}>Cancel</Btn>
            <Btn type="submit" variant="primary" disabled={loading || !url.trim()}>
              {loading ? "Submitting" : "Submit for review"}
            </Btn>
          </div>
        </form>
      </Modal>
    </>
  );
}
