"use client";
import { useEffect, useState } from "react";

interface Collection {
  id: string;
  slug: string;
  name: string;
  _count: { items: number };
}

export function AddToCollectionButton({ profileSlug }: { profileSlug: string }) {
  const [open, setOpen] = useState(false);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/collections")
      .then((r) => r.json())
      .then((data) => {
        setCollections(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [open]);

  const handleAdd = async (collectionSlug: string) => {
    setMessage("");
    try {
      const res = await fetch(`/api/collections/${collectionSlug}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileSlug }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(data.removed ? "Removed from collection" : "Added to collection");
      } else {
        setMessage(data.error || "Failed");
      }
    } catch {
      setMessage("Network error");
    }
    setTimeout(() => setMessage(""), 2000);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-2 py-1 text-xs rounded border border-[#1a2234] bg-[#141c2b] text-[#7888a0] hover:text-[#64ffda] hover:border-[#64ffda]/40 transition-colors"
      >
        + Add to Collection
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-sm p-6 rounded-lg border border-[#1a2234] bg-[#0e1420] mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold text-[#e8ecf4] mb-3">Add to Collection</h3>

            {message && (
              <div className="p-2 mb-3 text-xs rounded bg-[#64ffda]/10 text-[#64ffda] border border-[#64ffda]/20">
                {message}
              </div>
            )}

            {loading ? (
              <p className="text-sm text-[#4a5a70]">Loading...</p>
            ) : collections.length === 0 ? (
              <div className="text-sm text-[#4a5a70] space-y-2">
                <p className="italic">No collections yet.</p>
                <a href="/collections" className="block text-[#64ffda] hover:underline">
                  Create one first
                </a>
              </div>
            ) : (
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {collections.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleAdd(c.slug)}
                    className="w-full text-left px-3 py-2 text-sm rounded hover:bg-[#141c2b] border border-transparent hover:border-[#1a2234] transition-colors"
                  >
                    <span className="text-[#c8d0dc]">{c.name}</span>
                    <span className="text-xs text-[#4a5a70] ml-2">({c._count.items})</span>
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={() => setOpen(false)}
              className="w-full mt-3 px-3 py-1.5 text-sm rounded border border-[#1a2234] text-[#7888a0] hover:bg-[#1a2234] transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}