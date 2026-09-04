"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Btn } from "@/components/dossier";
import { FormNote, Modal, SelectPaper } from "@/components/dossier/modal";

/** "+ New group" on the desk; the form on paper. Opening the group goes straight to it. */
export function CreateGroupButton() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("fandom");
  const [icon, setIcon] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          category,
          icon: icon.trim() || undefined,
        }),
      });
      if (res.ok) {
        const group = await res.json();
        setOpen(false);
        setName("");
        setDescription("");
        setIcon("");
        router.push(`/groups/${group.slug}`);
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
      <Btn variant="desk" onClick={() => setOpen(true)}>+ New group</Btn>
      <Modal open={open} onClose={() => setOpen(false)} title="New group">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="lab">Name</span>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enneagram deep dive" required maxLength={100} className="input-paper" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="lab">Category</span>
            <SelectPaper value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="fandom">Fandom & Franchises</option>
              <option value="system">Typing Systems</option>
              <option value="theory">Theory & Debate</option>
              <option value="help">Help & Requests</option>
            </SelectPaper>
          </label>
          <label className="flex flex-col gap-1">
            <span className="lab">Notes</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What the group is for." rows={3} className="input-paper resize-y" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="lab">Mark</span>
            <input type="text" value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="A letter or two" maxLength={2} className="input-paper max-w-[120px]" />
          </label>
          {error && <FormNote error>{error}</FormNote>}
          <div className="flex justify-end gap-3 pt-2">
            <Btn onClick={() => setOpen(false)}>Cancel</Btn>
            <Btn type="submit" variant="primary" disabled={loading || !name.trim()}>
              {loading ? "Opening" : "Open the group"}
            </Btn>
          </div>
        </form>
      </Modal>
    </>
  );
}
