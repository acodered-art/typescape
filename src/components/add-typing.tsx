"use client";
import { useEffect, useState } from "react";
import { TYPING_SYSTEMS } from "@/lib/typing-systems";

export function AddTypingForm({ profileSlug }: { profileSlug: string }) {
  const [open, setOpen] = useState(false);
  const [systemId, setSystemId] = useState("");
  const [typeValue, setTypeValue] = useState("");
  const [systems, setSystems] = useState<{ id: string; slug: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/systems")
      .then((r) => r.json())
      .then((data) => setSystems(data.filter((s: { types?: unknown[] }) => s.types && Array.isArray(s.types) && s.types.length > 0)))
      .catch(() => {});
  }, []);

  const sys = systems.find((s) => s.id === systemId);
  const sysDef = TYPING_SYSTEMS.find((s) => s.slug === sys?.slug);

  const handleSubmit = async () => {
    if (!systemId || !typeValue) return;
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`/api/profiles/${profileSlug}/typings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ typingSystemId: systemId, typeValue }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage("Typing submitted!");
        setOpen(false);
        window.location.reload();
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
        className="text-xs px-2 py-1 rounded border border-[#64ffda]/20 text-[#64ffda] bg-[#64ffda]/10 hover:bg-[#64ffda]/20 transition-colors"
      >
        + Add Typing
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setOpen(false)}>
          <div className="w-80 p-4 rounded-lg border border-[#1a2234] bg-[#0e1420]" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-[#e8ecf4] mb-3">Submit a Typing</h3>
            <div className="space-y-2">
              <select
                value={systemId}
                onChange={(e) => { setSystemId(e.target.value); setTypeValue(""); }}
                className="w-full px-2 py-1.5 text-sm bg-[#141c2b] border border-[#1a2234] rounded text-[#c8d0dc]"
              >
                <option value="">Select system...</option>
                {systems.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <select
                value={typeValue}
                onChange={(e) => setTypeValue(e.target.value)}
                className="w-full px-2 py-1.5 text-sm bg-[#141c2b] border border-[#1a2234] rounded text-[#c8d0dc]"
                disabled={!sysDef}
              >
                <option value="">Select type...</option>
                {sysDef?.types?.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              {message && (
                <div className={`text-xs p-2 rounded ${message === "Typing submitted!" ? "bg-[#64ffda]/10 text-[#64ffda]" : "bg-[#ff6b6b]/10 text-[#ff6b6b]"}`}>
                  {message}
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <button onClick={() => setOpen(false)} className="flex-1 px-3 py-1.5 text-xs rounded border border-[#1a2234] text-[#7888a0] hover:bg-[#1a2234]">Cancel</button>
                <button onClick={handleSubmit} disabled={loading || !systemId || !typeValue} className="flex-1 px-3 py-1.5 text-xs rounded bg-[#64ffda]/10 text-[#64ffda] border border-[#64ffda]/20 disabled:opacity-30">
                  {loading ? "..." : "Submit"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}