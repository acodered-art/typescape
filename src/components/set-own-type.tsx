"use client";
import { useState } from "react";
import { TYPING_SYSTEMS } from "@/lib/typing-systems";

export function SetOwnType({ username, currentType }: { username: string; currentType?: string }) {
  const [open, setOpen] = useState(false);
  const [system, setSystem] = useState("mbti");
  const [typeValue, setTypeValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(currentType);

  const sys = TYPING_SYSTEMS.find((s) => s.slug === system);

  const handleSave = async () => {
    if (!typeValue) return;
    setSaving(true);
    try {
      const res = await fetch("/api/me/type", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ system, typeValue }),
      });
      if (res.ok) {
        setSaved(`${system}:${typeValue}`);
        setOpen(false);
      }
    } catch {} finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {saved && (
        <span className="text-xs px-2 py-0.5 rounded bg-[#64ffda]/10 text-[#64ffda] border border-[#64ffda]/20">
          {saved.split(":")[1] || saved}
        </span>
      )}
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-[#7888a0] hover:text-[#64ffda] transition-colors"
      >
        {saved ? "Change" : "Set your type"}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setOpen(false)}>
          <div className="w-80 p-4 rounded-lg border border-[#1a2234] bg-[#0e1420]" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-[#e8ecf4] mb-3">Set Your Personality Type</h3>
            <div className="space-y-2">
              <select value={system} onChange={(e) => setSystem(e.target.value)}
                className="w-full px-2 py-1.5 text-sm bg-[#141c2b] border border-[#1a2234] rounded text-[#c8d0dc]">
                {TYPING_SYSTEMS.filter(s => s.types?.length).map(s => (
                  <option key={s.slug} value={s.slug}>{s.name}</option>
                ))}
              </select>
              <select value={typeValue} onChange={(e) => setTypeValue(e.target.value)}
                className="w-full px-2 py-1.5 text-sm bg-[#141c2b] border border-[#1a2234] rounded text-[#c8d0dc]">
                <option value="">Select type...</option>
                {sys?.types?.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setOpen(false)} className="flex-1 px-3 py-1.5 text-xs rounded border border-[#1a2234] text-[#7888a0] hover:bg-[#1a2234]">Cancel</button>
                <button onClick={handleSave} disabled={saving || !typeValue} className="flex-1 px-3 py-1.5 text-xs rounded bg-[#64ffda]/10 text-[#64ffda] border border-[#64ffda]/20 disabled:opacity-30">
                  {saving ? "..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}