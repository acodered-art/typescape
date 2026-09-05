"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Btn } from "@/components/dossier";
import { FormNote, Modal } from "@/components/dossier/modal";

/** "+ New collection" on the desk; the form on paper. Opening the collection goes straight to it. */
export function CreateCollectionButton() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined }),
      });
      if (res.ok) {
        const col = await res.json();
        setOpen(false);
        setName("");
        setDescription("");
        router.push(`/collections/${col.slug}`);
      } else {
        const data = await res.json();
        setError(data.error || "That did not save.");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Btn variant="desk" onClick={() => setOpen(true)}>+ New collection</Btn>
      <Modal open={open} onClose={() => setOpen(false)} title="New collection">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="lab">Name</span>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Villains who were right" required maxLength={100} className="input-paper" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="lab">Notes</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What this collection gathers." rows={3} className="input-paper resize-y" />
          </label>
          {error && <FormNote error>{error}</FormNote>}
          <div className="flex justify-end gap-3 pt-2">
            <Btn onClick={() => setOpen(false)}>Cancel</Btn>
            <Btn type="submit" variant="primary" disabled={loading || !name.trim()}>
              {loading ? "Opening" : "Open the collection"}
            </Btn>
          </div>
        </form>
      </Modal>
    </>
  );
}
