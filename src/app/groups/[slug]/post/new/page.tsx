"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NewPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const [slug, setSlug] = useState<string>("");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  useState(() => { params.then((p) => setSlug(p.slug)); });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !text.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/groups/${slug}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), text: text.trim() }),
      });
      if (res.ok) {
        const post = await res.json();
        router.push(`/groups/${slug}/post/${post.id}`);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to post");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  if (!slug) return <div className="text-sm text-[#4a5a70] p-4">Loading...</div>;

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-[#e8ecf4]">New Post</h1>
      <form onSubmit={handleSubmit} className="space-y-3">
        {error && (
          <div className="p-2 text-xs rounded border border-[#ff6b6b]/40 bg-[#ff6b6b]/10 text-[#ff6b6b]">{error}</div>
        )}
        <div>
          <label className="block text-xs text-[#7888a0] mb-1">Title *</label>
          <input
            type="text" value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="What's on your mind?"
            required maxLength={200}
            className="w-full px-3 py-2 text-sm bg-[#141c2b] border border-[#1a2234] rounded text-[#c8d0dc] placeholder-[#4a5a70] focus:outline-none focus:border-[#64ffda]/40"
          />
        </div>
        <div>
          <label className="block text-xs text-[#7888a0] mb-1">Body *</label>
          <textarea
            value={text} onChange={(e) => setText(e.target.value)}
            placeholder="Share your thoughts, analysis, or questions..."
            rows={8}
            required
            className="w-full px-3 py-2 text-sm bg-[#141c2b] border border-[#1a2234] rounded text-[#c8d0dc] placeholder-[#4a5a70] focus:outline-none focus:border-[#64ffda]/40 resize-y"
          />
          <p className="text-xs text-[#4a5a70] mt-1">{text.length}/10000</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => router.back()}
            className="px-4 py-2 text-sm rounded border border-[#1a2234] text-[#7888a0] hover:bg-[#1a2234] transition-colors">Cancel</button>
          <button type="submit" disabled={loading || !title.trim() || !text.trim()}
            className="px-4 py-2 text-sm rounded bg-[#64ffda]/10 text-[#64ffda] border border-[#64ffda]/20 hover:bg-[#64ffda]/20 disabled:opacity-30 transition-colors">
            {loading ? "Posting..." : "Post"}
          </button>
        </div>
      </form>
    </div>
  );
}