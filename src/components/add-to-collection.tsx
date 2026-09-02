"use client";
import { useState } from "react";

export function AddToCollectionInline({ profileSlug }: { profileSlug: string }) {
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
        setMessage(data.removed ? "Removed" : "Added ✓");
        setTimeout(() => setMessage(""), 1500);
      }
    } catch {}
  };

  return (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); openPicker(); }}
        className="text-[10px] text-[#4a5a70] hover:text-[#64ffda] transition-colors"
      >
        + Collection
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setOpen(false)}>
          <div className="w-72 p-4 rounded-lg border border-[#1a2234] bg-[#0e1420]" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xs font-semibold text-[#e8ecf4] mb-2">Add to Collection</h3>
            {message && <div className="text-xs text-[#64ffda] mb-2">{message}</div>}
            {loading ? (
              <p className="text-xs text-[#4a5a70]">Loading...</p>
            ) : collections.length === 0 ? (
              <p className="text-xs text-[#4a5a70] italic">No collections</p>
            ) : (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {collections.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleAdd(c.slug)}
                    className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-[#141c2b] text-[#c8d0dc]"
                  >
                    {c.name} ({c._count.items})
                  </button>
                ))}
              </div>
            )}
            <button onClick={() => setOpen(false)} className="w-full mt-2 text-xs text-[#4a5a70] hover:text-[#c8d0dc]">Close</button>
          </div>
        </div>
      )}
    </>
  );
}