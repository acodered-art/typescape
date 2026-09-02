"use client";
import { useState } from "react";

export function UploadImageButton({ profileSlug, currentImage }: { profileSlug: string; currentImage?: string | null }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`/api/profiles/${profileSlug}/image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: url.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage("Image submitted! An admin will review it shortly.");
        setUrl("");
        setTimeout(() => { setOpen(false); setMessage(""); window.location.reload(); }, 2000);
      } else {
        setMessage(data.error || "Failed");
      }
    } catch {
      setMessage("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/40 transition-colors group rounded-lg"
        title="Upload image"
      >
        <span className="opacity-0 group-hover:opacity-100 text-xs text-white bg-black/60 px-2 py-1 rounded">
          {currentImage ? "Change" : "Add photo"}
        </span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-md p-6 rounded-lg border border-[#1a2234] bg-[#0e1420] mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold text-[#e8ecf4] mb-1">Upload Profile Image</h3>
            <p className="text-xs text-[#7888a0] mb-4">Paste a URL to an image. It will be reviewed by an admin before appearing.</p>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs text-[#7888a0] mb-1">Image URL</label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/character.jpg"
                  required
                  className="w-full px-3 py-2 text-sm bg-[#141c2b] border border-[#1a2234] rounded text-[#c8d0dc] placeholder-[#4a5a70] focus:outline-none focus:border-[#64ffda]/40"
                />
              </div>
              {message && (
                <div className={`p-2 text-xs rounded border ${message.includes("submitted") ? "bg-[#64ffda]/10 text-[#64ffda] border-[#64ffda]/20" : "bg-[#ff6b6b]/10 text-[#ff6b6b] border-[#ff6b6b]/20"}`}>
                  {message}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 px-3 py-2 text-sm rounded border border-[#1a2234] text-[#7888a0] hover:bg-[#1a2234] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !url.trim()}
                  className="flex-1 px-3 py-2 text-sm rounded bg-[#64ffda]/10 text-[#64ffda] border border-[#64ffda]/20 hover:bg-[#64ffda]/20 disabled:opacity-30 transition-colors"
                >
                  {loading ? "..." : "Submit for Review"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}