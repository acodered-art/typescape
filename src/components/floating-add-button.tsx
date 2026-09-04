"use client";
import { Btn } from "@/components/dossier";
import { useReaderHandle } from "@/components/dossier/reader";

/** The standing "+ New file" button, bottom right, for signed-in readers only. */
export function FloatingAddButton() {
  const me = useReaderHandle();
  if (!me) return null;
  return (
    <Btn href="/create" variant="primary" className="fixed bottom-6 right-6 z-40 shadow-[0_12px_28px_rgba(0,0,0,0.55)]" title="Open a new file">
      + New file
    </Btn>
  );
}
