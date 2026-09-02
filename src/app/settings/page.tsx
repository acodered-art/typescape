"use client";
import { useEffect, useState } from "react";

export default function SettingsPage() {
  const [user, setUser] = useState<{ id: string; username: string; email: string | null; bio: string | null; avatarUrl: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.user) {
          setUser(d.user);
          setBio(d.user.bio || "");
          setAvatarUrl(d.user.avatarUrl || "");
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/me/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio: bio.trim(), avatarUrl: avatarUrl.trim() || null }),
      });
      if (res.ok) {
        setMessage("Settings saved!");
        setTimeout(() => setMessage(""), 3000);
      } else {
        const d = await res.json();
        setError(d.error || "Failed to save");
      }
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-[#4a5a70] p-4">Loading...</p>;
  if (!user) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <h1 className="text-xl font-bold text-[#e8ecf4]">Settings</h1>
        <p className="text-sm text-[#7888a0] mt-2">Sign in to edit your profile.</p>
        <a href="/auth/signin" className="inline-block mt-4 px-4 py-2 text-sm rounded bg-[#64ffda]/10 text-[#64ffda] border border-[#64ffda]/20 hover:bg-[#64ffda]/20">
          Sign in
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-xl font-bold text-[#e8ecf4]">Settings</h1>

      <form onSubmit={handleSave} className="space-y-4">
        {message && (
          <div className="p-3 text-xs rounded border border-[#64ffda]/40 bg-[#64ffda]/10 text-[#64ffda]">{message}</div>
        )}
        {error && (
          <div className="p-3 text-xs rounded border border-[#ff6b6b]/40 bg-[#ff6b6b]/10 text-[#ff6b6b]">{error}</div>
        )}

        <div className="p-4 rounded border border-[#1a2234] bg-[#0e1420] space-y-3">
          <h2 className="text-sm font-semibold text-[#c8d0dc]">Profile</h2>

          <div>
            <label className="block text-xs text-[#7888a0] mb-1">Username</label>
            <input type="text" value={user.username} disabled
              className="w-full px-3 py-2 text-sm bg-[#141c2b] border border-[#1a2234] rounded text-[#4a5a70] cursor-not-allowed" />
          </div>

          <div>
            <label className="block text-xs text-[#7888a0] mb-1">Email</label>
            <input type="email" value={user.email || ""} disabled
              className="w-full px-3 py-2 text-sm bg-[#141c2b] border border-[#1a2234] rounded text-[#4a5a70] cursor-not-allowed" />
          </div>

          <div>
            <label className="block text-xs text-[#7888a0] mb-1">Avatar URL</label>
            <input type="url" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://example.com/avatar.jpg"
              className="w-full px-3 py-2 text-sm bg-[#141c2b] border border-[#1a2234] rounded text-[#c8d0dc] placeholder-[#4a5a70] focus:outline-none focus:border-[#64ffda]/40" />
            {avatarUrl && (
              <div className="mt-2 w-12 h-12 rounded-full overflow-hidden bg-[#1a2234]">
                <img src={avatarUrl} alt="preview" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs text-[#7888a0] mb-1">Bio</label>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself..."
              rows={3} maxLength={500}
              className="w-full px-3 py-2 text-sm bg-[#141c2b] border border-[#1a2234] rounded text-[#c8d0dc] placeholder-[#4a5a70] focus:outline-none focus:border-[#64ffda]/40 resize-none" />
            <p className="text-xs text-[#4a5a70] mt-1">{bio.length}/500</p>
          </div>
        </div>

        <button type="submit" disabled={saving}
          className="w-full px-4 py-2 text-sm rounded bg-[#64ffda]/10 text-[#64ffda] border border-[#64ffda]/20 hover:bg-[#64ffda]/20 disabled:opacity-30 transition-colors">
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </div>
  );
}