"use client";
import Link from "next/link";
import { useState } from "react";
import { Btn, Typed } from "@/components/dossier";
import { FormNote, Modal } from "@/components/dossier/modal";

/** "+ Collection": a small typed link (card footers) or a desk button (profile page) that opens the reader's collections on paper. */
export function AddToCollectionInline({ profileSlug, desk = false }: { profileSlug: string; desk?: boolean }) {
  const [open, setOpen] = useState(false);
  const [collections, setCollections] = useState<{ id: string; slug: string; name: string; _count: { items: number } }[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const openPicker = async () => {
    setOpen(true);
    setMessage("");
    setLoading(true);
    try {
      const res = await fetch("/api/collections");
      if (res.ok) setCollections(await res.json());
    } catch {} finally {
      setLoading(false);
    }
  };

  const handleAdd = async (collectionSlug: string) => {
    try {
      const res = await fetch(`/api/collections/${collectionSlug}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileSlug }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessage(data.removed ? "Removed from the collection." : "Added to the collection.");
        setTimeout(() => setMessage(""), 1500);
      }
    } catch {}
  };

  return (
    <>
      {desk ? (
        <Btn variant="desk" onClick={openPicker}>+ Collection</Btn>
      ) : (
        <button type="button" onClick={(e) => { e.stopPropagation(); openPicker(); }} className="font-typed text-[12px] text-navy underline hover:text-blue">
          + Collection
        </button>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Add to a collection" width={400}>
        <div className="flex flex-col gap-3">
          {message && <FormNote>{message}</FormNote>}
          {loading ? (
            <Typed>Opening your collections.</Typed>
          ) : collections.length === 0 ? (
            <Typed>
              No collections yet.{" "}
              <Link href="/collections" className="underline">Start one</Link>.
            </Typed>
          ) : (
            <div className="flex max-h-64 flex-col gap-[3px] overflow-y-auto">
              {collections.map((c) => (
                <button key={c.id} type="button" onClick={() => handleAdd(c.slug)} className="row-fill flex items-baseline justify-between gap-3 px-3 py-2 text-left hover:bg-blue">
                  <span className="font-display text-[18px] font-bold uppercase tracking-[0.04em]">{c.name}</span>
                  <span className="font-typed text-[12px] text-navy">{c._count.items} {c._count.items === 1 ? "file" : "files"}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
