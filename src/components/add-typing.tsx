"use client";
import { useEffect, useState } from "react";
import { Btn } from "@/components/dossier";
import { FormNote, Modal, SelectPaper } from "@/components/dossier/modal";

/** "Add your read": a paper modal with the system and type on typed selects. Filing reloads the file. */
export function AddTypingForm({ profileSlug, variant = "primary", label = "Add your read" }: { profileSlug: string; variant?: "primary" | "secondary" | "small"; label?: string }) {
  const [open, setOpen] = useState(false);
  const [systemId, setSystemId] = useState("");
  const [typeValue, setTypeValue] = useState("");
  const [systems, setSystems] = useState<{ id: string; slug: string; name: string; types: { value: string; label: string }[] }[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/systems")
      .then((r) => r.json())
      .then((data) => {
        const mapped = (data as { id: string; slug: string; name: string; config: { types?: { value: string; label: string }[] } }[])
          .filter((s) => s.config?.types && Array.isArray(s.config.types) && s.config.types.length > 0)
          .map((s) => ({ id: s.id, slug: s.slug, name: s.name, types: s.config.types! }));
        setSystems(mapped);
      })
      .catch(() => {});
  }, []);

  const sys = systems.find((s) => s.id === systemId);
  const filed = message === "Read filed.";

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
        setMessage("Read filed.");
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
      <Btn variant={variant} onClick={() => setOpen(true)}>
        {label}
      </Btn>

      <Modal open={open} onClose={() => setOpen(false)} title="Add your read">
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="lab">System</span>
            <SelectPaper value={systemId} onChange={(e) => { setSystemId(e.target.value); setTypeValue(""); }}>
              <option value="">Choose a system</option>
              {systems.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </SelectPaper>
          </label>
          <label className="flex flex-col gap-1">
            <span className="lab">Read</span>
            <SelectPaper value={typeValue} onChange={(e) => setTypeValue(e.target.value)} disabled={!sys}>
              <option value="">{sys ? "Choose a type" : "Choose a system first"}</option>
              {sys?.types?.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </SelectPaper>
          </label>
          {message && <FormNote error={!filed}>{message}</FormNote>}
          <div className="flex justify-end gap-3 pt-2">
            <Btn onClick={() => setOpen(false)}>Cancel</Btn>
            <Btn variant="primary" onClick={handleSubmit} disabled={loading || !systemId || !typeValue}>
              {loading ? "Filing" : "File the read"}
            </Btn>
          </div>
        </div>
      </Modal>
    </>
  );
}
