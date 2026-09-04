"use client";
import type { ReactNode } from "react";

/** Paper modal on the desk: a dark backdrop that closes on click, a white panel with the blue top edge. One primary button inside. */
export function Modal({ open, onClose, title, width = 440, children }: { open: boolean; onClose: () => void; title: string; width?: number; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose} role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="on-paper w-full border-t-4 border-blue bg-paper p-6 text-ink shadow-[0_24px_48px_rgba(0,0,0,0.55)]"
        style={{ maxWidth: width }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="sec-h">{title}</h2>
          <button type="button" onClick={onClose} className="font-typed text-[13px] text-navy underline hover:text-blue">
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Typed status line under a form. `error` prints the word Error before it. */
export function FormNote({ error = false, children }: { error?: boolean; children: ReactNode }) {
  return (
    <p className="font-typed text-[13px] leading-[1.5] text-navy" role="status">
      {error && <span className="lab mr-2 text-[13px]">Error</span>}
      {children}
    </p>
  );
}

/** A select on paper: the typed select inside a 1px steel box with a navy chevron drawn over it. */
export function SelectPaper({ className = "", children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className={`relative block border border-steel focus-within:border-blue ${className}`}>
      <select className="select-paper pr-9" {...rest}>
        {children}
      </select>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-navy" aria-hidden="true">
        <path d="M6 9l6 6 6-6" />
      </svg>
    </span>
  );
}
