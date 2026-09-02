"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function CreateProfileForm({ initialName }: { initialName?: string }) {
  const router = useRouter();
  const [name, setName] = useState(initialName || "");
  const [description, setDescription] = useState("");
  const [bio, setBio] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState<
    { id: string; name: string; slug: string; children: { id: string; name: string }[] }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data) => {
        setCategories(data);
        setFetching(false);
      })
      .catch(() => setFetching(false));
  }, []);

  // Flatten categories for search
  const flatCategories = categories.flatMap((cat) =>
    (cat.children || []).map((child) => ({
      id: child.id,
      label: `${cat.name} → ${child.name}`,
    }))
  );

  const filtered = searchTerm
    ? flatCategories.filter((c) => c.label.toLowerCase().includes(searchTerm.toLowerCase()))
    : flatCategories;

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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 rounded border border-[#ff6b6b]/40 bg-[#ff6b6b]/10 text-sm text-[#ff6b6b]">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-[#7888a0] uppercase tracking-wider mb-1">
            Name <span className="text-[#ff6b6b]">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Lelouch vi Britannia"
            required
            className="w-full px-3 py-2 text-sm bg-[#141c2b] border border-[#1a2234] rounded text-[#c8d0dc] placeholder-[#4a5a70] focus:outline-none focus:border-[#64ffda]/40"
          />
        </div>
        <div>
          <label className="block text-xs text-[#7888a0] uppercase tracking-wider mb-1">Image URL</label>
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://example.com/image.jpg"
            className="w-full px-3 py-2 text-sm bg-[#141c2b] border border-[#1a2234] rounded text-[#c8d0dc] placeholder-[#4a5a70] focus:outline-none focus:border-[#64ffda]/40"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs text-[#7888a0] uppercase tracking-wider mb-1">Short Description</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="A one-line description"
          className="w-full px-3 py-2 text-sm bg-[#141c2b] border border-[#1a2234] rounded text-[#c8d0dc] placeholder-[#4a5a70] focus:outline-none focus:border-[#64ffda]/40"
        />
      </div>

      <div>
        <label className="block text-xs text-[#7888a0] uppercase tracking-wider mb-1">Category</label>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search categories..."
          className="w-full px-3 py-2 text-sm bg-[#141c2b] border border-[#1a2234] rounded text-[#c8d0dc] placeholder-[#4a5a70] focus:outline-none focus:border-[#64ffda]/40 mb-2"
        />
        {fetching ? (
          <p className="text-xs text-[#4a5a70]">Loading categories...</p>
        ) : (
          <div className="max-h-40 overflow-y-auto space-y-0.5 border border-[#1a2234] rounded p-1">
            <button
              type="button"
              onClick={() => { setCategoryId(""); setSearchTerm(""); }}
              className={`w-full text-left px-2 py-1 text-xs rounded ${!categoryId ? "bg-[#64ffda]/10 text-[#64ffda]" : "text-[#7888a0] hover:text-[#c8d0dc]"}`}
            >
              Uncategorized
            </button>
            {filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => { setCategoryId(c.id); setSearchTerm(c.label.split(" → ")[1] || ""); }}
                className={`w-full text-left px-2 py-1 text-xs rounded ${categoryId === c.id ? "bg-[#64ffda]/10 text-[#64ffda]" : "text-[#7888a0] hover:text-[#c8d0dc]"}`}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="block text-xs text-[#7888a0] uppercase tracking-wider mb-1">Biography</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Full biography or description..."
          rows={4}
          className="w-full px-3 py-2 text-sm bg-[#141c2b] border border-[#1a2234] rounded text-[#c8d0dc] placeholder-[#4a5a70] focus:outline-none focus:border-[#64ffda]/40 resize-y"
        />
      </div>

      <button
        type="submit"
        disabled={loading || !name.trim()}
        className="w-full px-4 py-2.5 text-sm rounded bg-[#64ffda]/10 text-[#64ffda] border border-[#64ffda]/20 hover:bg-[#64ffda]/20 disabled:opacity-30 transition-colors"
      >
        {loading ? "Creating..." : "Create Profile"}
      </button>
    </form>
  );
}