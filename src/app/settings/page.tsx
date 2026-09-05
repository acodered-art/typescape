"use client";
import { useEffect, useState } from "react";
import { Btn, PageTitle, Portrait, Sheet, Typed } from "@/components/dossier";
import { FormNote } from "@/components/dossier/modal";

type Me = { id: string; username: string; email: string | null; bio: string | null; avatarUrl: string | null };

/** "Edit file": the reader's own notes and portrait on a sheet; handle and email are printed, not editable. */
export default function SettingsPage() {
  const [user, setUser] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/me");
        const d = await res.json();
        if (cancelled) return;
        if (d.user) {
          setUser(d.user);
          setBio(d.user.bio || "");
          setAvatarUrl(d.user.avatarUrl || "");
        }
      } catch {} finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
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
        setMessage("File saved.");
        setTimeout(() => setMessage(""), 3000);
      } else {
        const d = await res.json();
        setError(d.error || "That did not save.");
      }
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pb-10">
      <PageTitle title="Edit file" aside={user ? `Reader file for ${user.username}` : undefined} />
      <div className="max-w-[560px]">
        <Sheet className="flex flex-col gap-5">
          {loading ? (
            <Typed>Opening your file.</Typed>
          ) : !user ? (
            <div className="flex flex-col items-start gap-4">
              <Typed className="text-[14px]">Sign in to edit your file.</Typed>
              <Btn variant="primary" href="/auth/signin">Sign in</Btn>
            </div>
          ) : (
            <form onSubmit={handleSave} className="grid grid-cols-[96px_minmax(0,1fr)] items-baseline gap-x-3 gap-y-4">
              <div className="lab">Reader</div>
              <div className="ln text-[16px]">{user.username}</div>
              <div className="lab">Email</div>
              <div className="ln text-[16px]">{user.email || "none on file"}</div>
              <label htmlFor="avatar" className="lab">Portrait</label>
              <div className="flex flex-col gap-2">
                <input id="avatar" type="url" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://example.com/portrait.jpg" className="input-paper" />
                {avatarUrl && <Portrait src={avatarUrl} alt="Portrait preview" w={56} h={68} />}
              </div>
              <label htmlFor="bio" className="lab self-start pt-2">Notes</label>
              <div className="flex flex-col gap-1">
                <textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="How you read, what you argue about, what to ask you." rows={4} maxLength={500} className="input-paper resize-y" />
                <Typed className="text-[12px] text-steel-2">{bio.length} of 500</Typed>
              </div>
              <div className="col-span-2 flex flex-col gap-3 border-t-2 border-ink pt-4">
                {message && <FormNote>{message}</FormNote>}
                {error && <FormNote error>{error}</FormNote>}
                <div className="flex justify-end">
                  <Btn type="submit" variant="primary" disabled={saving}>
                    {saving ? "Saving" : "Save"}
                  </Btn>
                </div>
              </div>
            </form>
          )}
        </Sheet>
      </div>
    </div>
  );
}
