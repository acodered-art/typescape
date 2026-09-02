"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { TYPING_SYSTEMS } from "@/lib/typing-systems";

export function CreateProfileForm({ initialName }: { initialName?: string }) {
  const router = useRouter();
  const [name, setName] = useState(initialName || "");
  const [description, setDescription] = useState("");
  const [bio, setBio] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState<
    { id: string; name: string; slug: string; description: string | null; children: { id: string; name: string }[] }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Typing on creation
  const [addTyping, setAddTyping] = useState(false);
  const [typingSystem, setTypingSystem] = useState("");
  const [typingValue, setTypingValue] = useState("");

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data) => {
        setCategories(data);
        setFetching(false);
      })
      .catch(() => setFetching(false));
  }, []);

  const flatCategories = categories.flatMap((cat) => [
    { id: `parent:${cat.id}`, label: `📁 ${cat.name}`, parentId: null, isParent: true },
    ...(cat.children || []).map((child) => ({
      id: child.id,
      label: `  ${child.name}`,
      parentId: cat.id,
      isParent: false,
      parentName: cat.name,
    })),
  ]);

  const filtered = searchTerm
    ? flatCategories.filter((c) => c.label.toLowerCase().includes(searchTerm.toLowerCase()))
    : flatCategories;

  const selected = categories
    .flatMap((c) => c.children || [])
    .find((c) => c.id === categoryId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          bio: bio.trim() || undefined,
          imageUrl: imageUrl.trim() || undefined,
          categoryId: categoryId || undefined,
        }),
      });

      if (res.ok) {
        const profile = await res.json();

        // If user also submitted a typing, do it now
        if (addTyping && typingSystem && typingValue) {
          // Get typing system ID from the systems list
          const systemsRes = await fetch("/api/systems");
          const systems = await systemsRes.json();
          const sys = systems.find((s: { slug: string }) => s.slug === typingSystem);
          if (sys) {
            await fetch(`/api/profiles/${profile.slug}/typings`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ typingSystemId: sys.id, typeValue: typingValue }),
            });
          }
        }

        router.push(`/profiles/${profile.slug}`);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to create profile");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  const selectedSys = TYPING_SYSTEMS.find((s) => s.slug === typingSystem);

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="p-3 rounded border border-[#ff6b6b]/40 bg-[#ff6b6b]/10 text-sm text-[#ff6b6b]">
          {error}
        </div>
      )}

      {/* Name + Image row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2">
          <label className="block text-xs text-[#7888a0] uppercase tracking-wider mb-1">
            Character Name <span className="text-[#ff6b6b]">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Lelouch vi Britannia"
            required
            autoFocus
            className="w-full px-3 py-2 text-sm bg-[#141c2b] border border-[#1a2234] rounded text-[#c8d0dc] placeholder-[#4a5a70] focus:outline-none focus:border-[#64ffda]/40"
          />
        </div>
        <div>
          <label className="block text-xs text-[#7888a0] uppercase tracking-wider mb-1">Image URL</label>
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://..."
            className="w-full px-3 py-2 text-sm bg-[#141c2b] border border-[#1a2234] rounded text-[#c8d0dc] placeholder-[#4a5a70] focus:outline-none focus:border-[#64ffda]/40"
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs text-[#7888a0] uppercase tracking-wider mb-1">One-line Description</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g., The exiled prince of Britannia, master strategist and leader of the Black Knights"
          className="w-full px-3 py-2 text-sm bg-[#141c2b] border border-[#1a2234] rounded text-[#c8d0dc] placeholder-[#4a5a70] focus:outline-none focus:border-[#64ffda]/40"
        />
      </div>

      {/* Category with inline suggestions */}
      <div>
        <label className="block text-xs text-[#7888a0] uppercase tracking-wider mb-1">Show / Franchise</label>
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Type to search — e.g., 'Code Geass', 'Naruto', 'Marvel'..."
            className="w-full px-3 py-2 text-sm bg-[#141c2b] border border-[#1a2234] rounded text-[#c8d0dc] placeholder-[#4a5a70] focus:outline-none focus:border-[#64ffda]/40 mb-2"
          />
          {selected && !searchTerm && (
            <div className="text-xs text-[#64ffda] mb-2 px-1">
              Selected: {selected.name}
            </div>
          )}
        </div>
        {fetching ? (
          <p className="text-xs text-[#4a5a70]">Loading franchises...</p>
        ) : searchTerm || (!selected && !categoryId) ? (
          <div className="max-h-40 overflow-y-auto space-y-0.5 border border-[#1a2234] rounded p-1">
            <button
              type="button"
              onClick={() => { setCategoryId(""); setSearchTerm(""); }}
              className={`w-full text-left px-2 py-1 text-xs rounded ${!categoryId && !searchTerm ? "bg-[#64ffda]/10 text-[#64ffda]" : "text-[#7888a0] hover:text-[#c8d0dc]"}`}
            >
              Uncategorized
            </button>
            {filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  if (c.isParent) {
                    setCategoryId("");
                    setSearchTerm(c.label.replace("📁 ", ""));
                  } else {
                    setCategoryId(c.id);
                    setSearchTerm("");
                  }
                }}
                className={`w-full text-left px-2 py-1 text-xs rounded ${
                  categoryId === c.id
                    ? "bg-[#64ffda]/10 text-[#64ffda]"
                    : c.isParent
                    ? "text-[#4a5a70] font-medium"
                    : "text-[#7888a0] hover:text-[#c8d0dc]"
                }`}
              >
                {c.label}
              </button>
            ))}
            {searchTerm && filtered.length === 0 && (
              <div className="text-center py-3">
                <p className="text-xs text-[#4a5a70] mb-2">No franchise found for "{searchTerm}"</p>
                <p className="text-xs text-[#7888a0]">Pick a parent category and it will be added.</p>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Quick Typing on creation */}
      <div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-[#7888a0] uppercase tracking-wider">Add a typing?</label>
          <button
            type="button"
            onClick={() => setAddTyping(!addTyping)}
            className={`text-xs px-2 py-0.5 rounded border transition-colors ${
              addTyping ? "bg-[#64ffda]/10 text-[#64ffda] border-[#64ffda]/20" : "bg-[#1a2234] text-[#4a5a70] border-[#1a2234]"
            }`}
          >
            {addTyping ? "Yes" : "Not now"}
          </button>
        </div>
        {addTyping && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <select
              value={typingSystem}
              onChange={(e) => { setTypingSystem(e.target.value); setTypingValue(""); }}
              className="px-2 py-1.5 text-sm bg-[#141c2b] border border-[#1a2234] rounded text-[#c8d0dc]"
            >
              <option value="">System...</option>
              {TYPING_SYSTEMS.filter((s) => s.types?.length).map((s) => (
                <option key={s.slug} value={s.slug}>{s.name}</option>
              ))}
            </select>
            <select
              value={typingValue}
              onChange={(e) => setTypingValue(e.target.value)}
              className="px-2 py-1.5 text-sm bg-[#141c2b] border border-[#1a2234] rounded text-[#c8d0dc]"
              disabled={!typingSystem}
            >
              <option value="">Type...</option>
              {selectedSys?.types?.map((t) => (
                <option key={t.value} value={t.value}>{t.value}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Biography */}
      <details>
        <summary className="text-xs text-[#7888a0] cursor-pointer hover:text-[#c8d0dc]">Add biography (optional)</summary>
        <div className="mt-2">
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Full biography, backstory, or description..."
            rows={4}
            className="w-full px-3 py-2 text-sm bg-[#141c2b] border border-[#1a2234] rounded text-[#c8d0dc] placeholder-[#4a5a70] focus:outline-none focus:border-[#64ffda]/40 resize-y"
          />
        </div>
      </details>

      <button
        type="submit"
        disabled={loading || !name.trim()}
        className="w-full px-4 py-3 text-sm rounded bg-[#64ffda]/10 text-[#64ffda] border border-[#64ffda]/20 hover:bg-[#64ffda]/20 disabled:opacity-30 transition-colors font-semibold"
      >
        {loading ? "Creating..." : "Create Profile"}
      </button>
    </form>
  );
}