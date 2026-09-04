"use client";
import { useState } from "react";
import { TYPING_SYSTEMS } from "@/lib/typing-systems";
import { Btn } from "@/components/dossier";
import { FormNote, Modal, SelectPaper } from "@/components/dossier/modal";

const SYSTEMS = TYPING_SYSTEMS.filter((s) => s.types?.length);
const shortName = (name: string) => name.replace(/\s*\(.*\)\s*$/, "").trim() || name;

/** "Set my type": the reader's self-reported read, saved as system:type. Saving reloads the file so the stamp lands. */
export function SetOwnType({ username, currentType }: { username: string; currentType?: string }) {
  const [open, setOpen] = useState(false);
  const [system, setSystem] = useState(currentType?.split(":")[0] && SYSTEMS.some((s) => s.slug === currentType.split(":")[0]) ? currentType.split(":")[0] : "mbti");
  const [typeValue, setTypeValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState("");

  const sys = SYSTEMS.find((s) => s.slug === system);

  const handleSave = async () => {
    if (!typeValue) return;
    setSaving(true);
    setNote("");
    try {
      const res = await fetch("/api/me/type", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ system, typeValue }),
      });
      if (res.ok) {
        setOpen(false);
        window.location.reload();
      } else {
        setNote(res.status === 401 ? "Sign in to set your type." : "That did not save.");
      }
    } catch {
      setNote("Network error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Btn onClick={() => setOpen(true)} title={`Self-reported type for ${username}`}>
        {currentType ? "Change my type" : "Set my type"}
      </Btn>
      <Modal open={open} onClose={() => setOpen(false)} title="My type">
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="lab">System</span>
            <SelectPaper value={system} onChange={(e) => { setSystem(e.target.value); setTypeValue(""); }}>
              {SYSTEMS.map((s) => (
                <option key={s.slug} value={s.slug}>{shortName(s.name)}</option>
              ))}
            </SelectPaper>
          </label>
          <label className="flex flex-col gap-1">
            <span className="lab">Read</span>
            <SelectPaper value={typeValue} onChange={(e) => setTypeValue(e.target.value)}>
              <option value="">Choose a type</option>
              {sys?.types?.map((t) => (
                <option key={t.value} value={t.value}>{t.label.replace(" — ", ", ")}</option>
              ))}
            </SelectPaper>
          </label>
          {note && <FormNote error>{note}</FormNote>}
          <div className="flex justify-end gap-3 pt-2">
            <Btn onClick={() => setOpen(false)}>Cancel</Btn>
            <Btn variant="primary" onClick={handleSave} disabled={saving || !typeValue}>
              {saving ? "Saving" : "Stamp it"}
            </Btn>
          </div>
        </div>
      </Modal>
    </>
  );
}
