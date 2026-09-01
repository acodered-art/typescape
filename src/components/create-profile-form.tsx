"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function CreateProfileForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [bio, setBio] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState<
    { id: string; name: string; slug: string; children: { id: string; name: string }[] }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");

  // Fetch categories on mount
  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data) => {
        setCategories(data);
        setFetching(false);
      })
      .catch(() => setFetching(false));
  }, []);

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
        <label className="block text-xs text-[#7888a0] uppercase tracking-wider mb-1">
          Category
        </label>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="w-full px-3 py-2 text-sm bg-[#141c2b] border border-[#1a2234] rounded text-[#c8d0dc] focus:outline-none focus:border-[#64ffda]/40"
        >
          <option value="">Uncategorized</option>
          {fetching ? (
            <option disabled>Loading...</option>
          ) : (
            categories.map((cat) => (
              <optgroup key={cat.id} label={cat.name}>
                {cat.children.map((child) => (
                  <option key={child.id} value={child.id}>
                    {cat.name} → {child.name}
                  </option>
                ))}
              </optgroup>
            ))
          )}
        </select>
      </div>

      <div>
        <label className="block text-xs text-[#7888a0] uppercase tracking-wider mb-1">
          Short Description
        </label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="A one-line description"
          className="w-full px-3 py-2 text-sm bg-[#141c2b] border border-[#1a2234] rounded text-[#c8d0dc] placeholder-[#4a5a70] focus:outline-none focus:border-[#64ffda]/40"
        />
      </div>

      <div>
        <label className="block text-xs text-[#7888a0] uppercase tracking-wider mb-1">
          Biography
        </label>
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