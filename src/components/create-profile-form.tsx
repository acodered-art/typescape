"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { TYPING_SYSTEMS } from "@/lib/typing-systems";
import { Btn, Section, SectionHead, Sheet, Typed } from "@/components/dossier";
import { FormNote, SelectPaper } from "@/components/dossier/modal";

const SYSTEMS = TYPING_SYSTEMS.filter((s) => s.types?.length);
const shortName = (name: string) => name.replace(/\s*\(.*\)\s*$/, "").trim() || name;

/** The new file as a punched sheet: SUBJECT, PORTRAIT, SUMMARY, SOURCE (a searchable drawer list), NOTES, and an optional first read. */
export function CreateProfileForm({ initialName }: { initialName?: string }) {
  const router = useRouter();
  const [name, setName] = useState(initialName || "");
  const [description, setDescription] = useState("");
  const [bio, setBio] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState<{ id: string; name: string; slug: string; description: string | null; children: { id: string; name: string }[] }[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // A first read on the file
  const [addTyping, setAddTyping] = useState(false);
  const [typingSystem, setTypingSystem] = useState("");
  const [typingValue, setTypingValue] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/categories");
        const data = await r.json();
        if (!cancelled) setCategories(data);
      } catch {} finally {
        if (!cancelled) setFetching(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const flatCategories = categories.flatMap((cat) => [
    { id: `parent:${cat.id}`, label: cat.name, parentId: null, isParent: true },
    ...(cat.children || []).map((child) => ({
      id: child.id,
      label: child.name,
      parentId: cat.id,
      isParent: false,
      parentName: cat.name,
    })),
  ]);

  const filtered = searchTerm ? flatCategories.filter((c) => c.label.toLowerCase().includes(searchTerm.toLowerCase())) : flatCategories;

  const selected = categories.flatMap((c) => c.children || []).find((c) => c.id === categoryId);
  const selectedParent = categories.find((c) => (c.children || []).some((ch) => ch.id === categoryId));

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

        // If the reader also filed a first read, do it now
        if (addTyping && typingSystem && typingValue) {
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
        setError(res.status === 401 ? "Sign in to open a file." : data.error || "The file could not be opened.");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  const selectedSys = SYSTEMS.find((s) => s.slug === typingSystem);
  const showDrawers = !fetching && (searchTerm || !categoryId);

  return (
    <Sheet punched>
      <form onSubmit={handleSubmit} className="flex flex-col gap-[22px]">
        <div className="grid grid-cols-[96px_minmax(0,1fr)] items-baseline gap-x-3 gap-y-4">
          <label htmlFor="name" className="lab">Subject</label>
          <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Lelouch vi Britannia" required autoFocus className="input-paper font-display text-[28px] font-extrabold uppercase" />

          <label htmlFor="image" className="lab">Portrait</label>
          <input id="image" type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://example.com/portrait.jpg (a moderator reviews it)" className="input-paper" />

          <label htmlFor="description" className="lab">Summary</label>
          <input id="description" type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="The exiled prince of Britannia, strategist and leader of the Black Knights" className="input-paper" />

          <label htmlFor="source" className="lab self-start pt-2">Source</label>
          <div className="flex flex-col gap-2">
            {selected && !searchTerm ? (
              <Typed className="text-[14px]">
                Filed under {selected.name}{selectedParent ? `, in ${selectedParent.name}` : ""}.{" "}
                <button type="button" onClick={() => { setCategoryId(""); setSearchTerm(""); }} className="text-blue underline hover:text-navy">Change</button>
              </Typed>
            ) : (
              <input id="source" type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search the cabinet: Code Geass, Naruto, Marvel" className="input-paper" />
            )}
            {fetching && <Typed>Opening the cabinet.</Typed>}
            {showDrawers && (
              <div className="flex max-h-48 flex-col gap-[2px] overflow-y-auto border border-steel p-1">
                <button type="button" onClick={() => { setCategoryId(""); setSearchTerm(""); }} className={`px-2 py-[6px] text-left font-typed text-[13px] ${!categoryId && !searchTerm ? "bg-navy text-paper" : "text-navy hover:bg-paper-2"}`}>
                  Unfiled
                </button>
                {filtered.map((c) =>
                  c.isParent ? (
                    <button key={c.id} type="button" onClick={() => { setCategoryId(""); setSearchTerm(c.label); }} className="px-2 pb-1 pt-2 text-left font-display text-[14px] font-bold uppercase tracking-[0.1em] text-steel-2 hover:text-navy">
                      {c.label}
                    </button>
                  ) : (
                    <button key={c.id} type="button" onClick={() => { setCategoryId(c.id); setSearchTerm(""); }} className={`px-4 py-[6px] text-left font-typed text-[13px] ${categoryId === c.id ? "bg-navy text-paper" : "text-ink hover:bg-paper-2"}`}>
                      {c.label}
                    </button>
                  )
                )}
                {searchTerm && filtered.length === 0 && (
                  <Typed className="px-2 py-2">No drawer matches that. Pick a cabinet and the file goes there.</Typed>
                )}
              </div>
            )}
          </div>

          <label htmlFor="bio" className="lab self-start pt-2">Notes</label>
          <textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Backstory, arc, what the reads argue about." rows={4} className="input-paper resize-y" />
        </div>

        <Section>
          <SectionHead title="First read" aside="Optional. You can add reads on the file later." />
          <div className="flex flex-wrap items-center gap-3">
            <Btn variant="small" onClick={() => setAddTyping(!addTyping)} className={addTyping ? "bg-blue text-ink" : ""}>
              {addTyping ? "Filing a first read" : "Add a first read"}
            </Btn>
            {!addTyping && <Typed>Not now.</Typed>}
          </div>
          {addTyping && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="lab">System</span>
                <SelectPaper value={typingSystem} onChange={(e) => { setTypingSystem(e.target.value); setTypingValue(""); }}>
                  <option value="">Choose a system</option>
                  {SYSTEMS.map((s) => (
                    <option key={s.slug} value={s.slug}>{shortName(s.name)}</option>
                  ))}
                </SelectPaper>
              </label>
              <label className="flex flex-col gap-1">
                <span className="lab">Read</span>
                <SelectPaper value={typingValue} onChange={(e) => setTypingValue(e.target.value)} disabled={!typingSystem}>
                  <option value="">{typingSystem ? "Choose a type" : "Choose a system first"}</option>
                  {selectedSys?.types?.map((t) => (
                    <option key={t.value} value={t.value}>{t.value}</option>
                  ))}
                </SelectPaper>
              </label>
            </div>
          )}
        </Section>

        <div className="flex flex-col gap-3 border-t-2 border-ink pt-[18px]">
          {error && <FormNote error>{error}</FormNote>}
          <div className="flex justify-end">
            <Btn type="submit" variant="primary" disabled={loading || !name.trim()}>
              {loading ? "Opening" : "Open the file"}
            </Btn>
          </div>
        </div>
      </form>
    </Sheet>
  );
}
