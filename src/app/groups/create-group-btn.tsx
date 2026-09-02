"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

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
        setError(data.error || "Failed to create");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 text-sm rounded bg-[#64ffda]/10 text-[#64ffda] border border-[#64ffda]/20 hover:bg-[#64ffda]/20 transition-colors"
      >
        + New Group
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md p-6 rounded-lg border border-[#1a2234] bg-[#0e1420] mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-semibold text-[#e8ecf4] mb-4">Create Group</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              {error && (
                <div className="p-2 text-xs rounded border border-[#ff6b6b]/40 bg-[#ff6b6b]/10 text-[#ff6b6b]">{error}</div>
              )}
              <div>
                <label className="block text-xs text-[#7888a0] mb-1">Name *</label>
                <input
                  type="text" value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Enneagram Deep Dive"
                  required maxLength={100}
                  className="w-full px-3 py-2 text-sm bg-[#141c2b] border border-[#1a2234] rounded text-[#c8d0dc] placeholder-[#4a5a70] focus:outline-none focus:border-[#64ffda]/40"
                />
              </div>
              <div>
                <label className="block text-xs text-[#7888a0] mb-1">Category</label>
                <select
                  value={category} onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-[#141c2b] border border-[#1a2234] rounded text-[#c8d0dc]"
                >
                  <option value="fandom">Fandom & Franchises</option>
                  <option value="system">Typing Systems</option>
                  <option value="theory">Theory & Debate</option>
                  <option value="help">Help & Requests</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-[#7888a0] mb-1">Description</label>
                <textarea
                  value={description} onChange={(e) => setDescription(e.target.value)}
                  placeholder="What's this group about?"
                  rows={2}
                  className="w-full px-3 py-2 text-sm bg-[#141c2b] border border-[#1a2234] rounded text-[#c8d0dc] placeholder-[#4a5a70] focus:outline-none focus:border-[#64ffda]/40 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs text-[#7888a0] mb-1">Icon (emoji or initial)</label>
                <input
                  type="text" value={icon} onChange={(e) => setIcon(e.target.value)}
                  placeholder="e.g., 🧠"
                  maxLength={2}
                  className="w-full px-3 py-2 text-sm bg-[#141c2b] border border-[#1a2234] rounded text-[#c8d0dc] placeholder-[#4a5a70] focus:outline-none focus:border-[#64ffda]/40"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setOpen(false)}
                  className="flex-1 px-3 py-2 text-sm rounded border border-[#1a2234] text-[#7888a0] hover:bg-[#1a2234] transition-colors">Cancel</button>
                <button type="submit" disabled={loading || !name.trim()}
                  className="flex-1 px-3 py-2 text-sm rounded bg-[#64ffda]/10 text-[#64ffda] border border-[#64ffda]/20 hover:bg-[#64ffda]/20 disabled:opacity-30 transition-colors">
                  {loading ? "Creating..." : "Create Group"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}