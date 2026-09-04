import Link from "next/link";
import type { ReactNode } from "react";
import { TYPING_SYSTEMS } from "@/lib/typing-systems";

/* ============================================================
   Dossier primitives: the case-file vocabulary every screen uses.
   Server-safe (no hooks). Values come from the design handoff; the
   heavy lifting (clip-path, stack, stamp, ink filter) lives in
   globals.css as .tab / .sheet / .stamp / .ink and friends.
   ============================================================ */

/** SVG ink filter. Rendered once per page (in the root layout); stamps and tags reference it as url(#ink). */
export function InkFilter() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
      <filter id="ink">
        <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="3" seed="7" result="n" />
        <feColorMatrix in="n" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -1.6 2.1" result="m" />
        <feComposite in="SourceGraphic" in2="m" operator="in" result="s" />
        <feDisplacementMap in="s" in2="n" scale="2.5" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </svg>
  );
}

/** The white sheet on its stack of two loose sheets. `punched` adds the two holes in the left margin. */
export function Sheet({ punched = false, className = "", children }: { punched?: boolean; className?: string; children: ReactNode }) {
  return (
    <div className="sheet-wrap">
      <span className="sheet-under sheet-under-1" aria-hidden="true" />
      <span className="sheet-under sheet-under-2" aria-hidden="true" />
      <div className={`sheet on-paper ${punched ? "sheet-punched" : ""} ${className}`}>{children}</div>
    </div>
  );
}

/** A folder tab. Renders a link when `href` is given, otherwise a button (for client-side tab state). */
export function FolderTab({ href, active = false, small = false, onClick, children }: { href?: string; active?: boolean; small?: boolean; onClick?: () => void; children: ReactNode }) {
  const cls = `tab ${active ? "tab-active" : ""} ${small ? "tab-sm" : ""}`;
  if (href) return <Link href={href} className={cls} aria-current={active ? "page" : undefined}>{children}</Link>;
  return <button type="button" onClick={onClick} className={cls} aria-pressed={active}>{children}</button>;
}

/** The strip of tabs sitting on the sheet's top edge. */
export function TabStrip({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`flex items-end gap-1 overflow-x-auto pt-9 ${className}`}>{children}</div>;
}

/** Big page title on the desk with a typed aside (Browse the files / 19 files, showing all). */
export function PageTitle({ title, aside, children }: { title: ReactNode; aside?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 pb-5 pt-8">
      <h1 className="font-display text-[40px] font-extrabold uppercase leading-none tracking-[0.02em] sm:text-[48px]">{title}</h1>
      {aside && <div className="font-typed text-[13px] text-paper/60">{aside}</div>}
      {children}
    </div>
  );
}

/** Section on the sheet: 2px ink rule above, then children. */
export function Section({ className = "", children }: { className?: string; children: ReactNode }) {
  return <section className={`sec flex flex-col gap-[10px] ${className}`}>{children}</section>;
}

/** Section heading: blue square + display heading, typed aside on the right. */
export function SectionHead({ title, aside, size = 24 }: { title: ReactNode; aside?: ReactNode; size?: 24 | 20 }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <div className="flex items-center gap-[10px]">
        <span className="sq" />
        <h2 className="sec-h" style={size === 20 ? { fontSize: 20 } : undefined}>{title}</h2>
      </div>
      {aside && <div className="font-typed text-[13px] text-navy">{aside}</div>}
    </div>
  );
}

/** Grid for printed label / typed value pairs. */
export function FieldGrid({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`grid grid-cols-[96px_minmax(0,1fr)] items-baseline gap-x-3 gap-y-[10px] ${className}`}>{children}</div>;
}

/** One field: pre-printed label, typed value on a 1px steel rule. Pass `ruled` for multi-line notes. */
export function Field({ label, ruled = false, className = "", children }: { label: string; ruled?: boolean; className?: string; children: ReactNode }) {
  return (
    <>
      <div className="lab">{label}</div>
      <div className={ruled ? `ruled max-w-[520px] text-[14px] ${className}` : `ln text-[16px] ${className}`}>{children}</div>
    </>
  );
}

/** Type code chip. Blue = primary or certified, navy = secondary or an individual reader's read. */
export function CodeChip({ href, tone = "blue", title, className = "", children }: { href?: string; tone?: "blue" | "navy" | "paper"; title?: string; className?: string; children: ReactNode }) {
  const cls = `chip ${tone === "navy" ? "chip-navy" : tone === "paper" ? "chip-paper" : ""} ${className}`;
  if (href) return <Link href={href} className={cls} title={title}>{children}</Link>;
  return <span className={cls} title={title}>{children}</span>;
}

/** Small ink-stamped tag (DISPUTED, achievements). Keep the text at 12px or larger; the filter eats smaller type. */
export function InkTag({ rotate = -3, className = "", children }: { rotate?: number; className?: string; children: ReactNode }) {
  return <span className={`tag inline-block ${className}`} style={{ transform: `rotate(${rotate}deg)` }}>{children}</span>;
}

/** Unearned or inactive tag: dashed outline, no ink. */
export function OffTag({ className = "", children }: { className?: string; children: ReactNode }) {
  return <span className={`tag-off inline-block ${className}`}>{children}</span>;
}

type BtnProps = {
  href?: string;
  variant?: "primary" | "secondary" | "desk" | "small";
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
  onClick?: () => void;
  title?: string;
  children: ReactNode;
};

/** Button. primary = filled blue (one per view), secondary = ink outline on paper, desk = blue outline on the desk, small = typed 12px. */
export function Btn({ href, variant = "secondary", className = "", type = "button", disabled, onClick, title, children }: BtnProps) {
  const cls = `btn ${variant === "primary" ? "btn-primary" : variant === "desk" ? "btn-desk" : variant === "small" ? "btn-sm" : ""} ${className}`;
  if (href && !disabled) return <Link href={href} className={cls} title={title}>{children}</Link>;
  return <button type={type} className={cls} disabled={disabled} onClick={onClick} title={title}>{children}</button>;
}

/** The consensus stamp. Position it with className (e.g. "right-10 top-[34px]"). size lg = 88px code (desktop), sm = 50px (phone). */
export function Stamp({ code, line, size = "lg", className = "" }: { code: string; line: string; size?: "lg" | "sm"; className?: string }) {
  return (
    <div className={`stamp ${className}`} role="img" aria-label={`${code}. ${line}`}>
      <div className="font-display font-extrabold leading-[0.9] tracking-[0.04em]" style={{ fontSize: size === "lg" ? 88 : 50 }}>{code}</div>
      <div className="font-typed text-[12px] font-bold tracking-[0.2em]">{line}</div>
    </div>
  );
}

/** Portrait box: the image when there is one, the steel silhouette when there is not. */
export function Portrait({ src, alt, w = 56, h = 68, className = "" }: { src?: string | null; alt: string; w?: number; h?: number; className?: string }) {
  return (
    <div className={`shrink-0 overflow-hidden border border-steel bg-paper-2 ${className}`} style={{ width: w, height: h }}>
      {src ? (
        <img src={src} alt={alt} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <svg width={w - 2} height={h - 2} viewBox="0 0 54 66" className="block" aria-hidden="true">
          <circle cx="27" cy="24" r="11" fill="#9daecc" />
          <path d="M6 66 C6 46 16 40 27 40 C38 40 48 46 48 66 Z" fill="#9daecc" />
        </svg>
      )}
    </div>
  );
}

/** Paper clip, for a portrait or a slip. Absolutely positioned by the caller. */
export function PaperClip({ className = "" }: { className?: string }) {
  return (
    <svg width="26" height="46" viewBox="0 0 24 44" fill="none" stroke="#0e4a80" strokeWidth="1.8" className={`pointer-events-none absolute ${className}`} aria-hidden="true">
      <path d="M6 12v22a6 6 0 0 0 12 0V8a4 4 0 0 0-8 0v24a2 2 0 0 0 4 0V12" />
    </svg>
  );
}

/**
 * File card: series header (typed 11px caps), portrait, name (display 26px), a row of code chips.
 * variant "sheet" = 1px steel border (inside a sheet); "desk" = white card with a 4px blue top edge and a shadow (on the desk).
 */
export function FileCard({ href, name, series, aside, imageUrl, variant = "sheet", nameSize = 26, chips, children }: {
  href: string;
  name: string;
  series?: string | null;
  aside?: ReactNode;
  imageUrl?: string | null;
  variant?: "sheet" | "desk";
  nameSize?: 26 | 30;
  chips?: ReactNode;
  children?: ReactNode;
}) {
  const box = variant === "desk"
    ? "bg-paper text-ink border-t-4 border-blue shadow-[0_12px_28px_rgba(0,0,0,0.45)]"
    : "bg-paper text-ink border border-steel";
  return (
    <div className={`on-paper flex flex-col ${box}`}>
      <div className="flex justify-between gap-2 px-3 pt-2 font-typed text-[11px] font-bold uppercase tracking-[0.14em] text-navy">
        <span className="truncate">{series || "Unfiled"}</span>
        {aside && <span className="shrink-0 whitespace-nowrap">{aside}</span>}
      </div>
      <div className="flex items-start gap-3 px-3 pb-[14px] pt-[10px]">
        <Link href={href} className="shrink-0"><Portrait src={imageUrl} alt={name} /></Link>
        <div className="flex min-w-0 flex-col gap-2">
          <Link href={href} className="font-display font-extrabold uppercase leading-[0.95] text-ink hover:text-navy" style={{ fontSize: nameSize }}>{name}</Link>
          {chips && <div className="flex flex-wrap gap-1.5">{chips}</div>}
        </div>
      </div>
      {children}
    </div>
  );
}

/** Typed row on navy for a rail list (Cabinet drawers, Systems). `off` = dashed pending row. */
export function RailRow({ href, active = false, off = false, aside, children }: { href?: string; active?: boolean; off?: boolean; aside?: ReactNode; children: ReactNode }) {
  const cls = `rail-row ${active ? "rail-row-active" : ""} ${off ? "rail-row-off" : ""}`;
  const inner = (
    <>
      <span className="min-w-0 truncate">{children}</span>
      {aside !== undefined && <span className={`shrink-0 whitespace-nowrap ${active ? "" : "text-paper/60"}`}>{aside}</span>}
    </>
  );
  if (href) return <Link href={href} className={cls}>{inner}</Link>;
  return <div className={cls}>{inner}</div>;
}

/** Empty state on the sheet: dashed steel box and a sentence that says what would change it. */
export function EmptySlot({ label, className = "", children }: { label?: string; className?: string; children: ReactNode }) {
  return (
    <div className={`dashed flex flex-col justify-center gap-[10px] px-[18px] py-5 ${className}`}>
      {label && <span className="lab text-steel-2">{label}</span>}
      <div className="font-typed text-[14px] leading-[1.5] text-navy">{children}</div>
    </div>
  );
}

/** Typed small text in navy (asides, sources, captions on paper). */
export function Typed({ className = "", children }: { className?: string; children: ReactNode }) {
  return <span className={`font-typed text-[13px] text-navy ${className}`}>{children}</span>;
}

/**
 * Segmented agreement bar: the leading read in blue, the runner-up in navy, everything else in steel.
 * Shares are percentages (0-100). Labels print inside the segments when the bar is tall enough
 * (22px rows on Home); the 10px bars on a profile's finding rows pass none.
 */
export function SegBar({ lead, runner = 0, leadLabel, runnerLabel, height = 22, className = "" }: {
  lead: number; runner?: number; leadLabel?: string; runnerLabel?: string; height?: number; className?: string;
}) {
  const rest = Math.max(0, 100 - lead - runner);
  const label = leadLabel || runnerLabel ? `${leadLabel ?? ""}${runnerLabel ? `, ${runnerLabel}` : ""}` : undefined;
  return (
    <div className={`flex gap-[3px] overflow-hidden ${className}`} style={{ height }} role="img" aria-label={label}>
      <div className="flex items-center overflow-hidden whitespace-nowrap bg-blue px-2 font-typed text-[13px] font-bold text-ink" style={{ width: `${lead}%` }}>{leadLabel}</div>
      {runner > 0 && <div className="flex items-center justify-end overflow-hidden whitespace-nowrap bg-navy px-2 font-typed text-[13px] font-bold text-paper" style={{ width: `${runner}%` }}>{runnerLabel}</div>}
      {rest > 0 && <div className="bg-steel" style={{ width: `${rest}%` }} />}
    </div>
  );
}

/** Navy card on the desk (cabinet drawers, feed cards): 40x4 blue bar, display 28 title, typed 12px text. A link when href is given. */
export function NavyCard({ href, title, className = "", children }: { href?: string; title: ReactNode; className?: string; children?: ReactNode }) {
  const cls = `group flex min-h-[130px] flex-col gap-[10px] bg-navy px-4 pb-[14px] pt-4 text-paper ${href ? "hover:bg-blue hover:text-ink" : ""} ${className}`;
  const inner = (
    <>
      <span className="block h-1 w-10 bg-blue group-hover:bg-ink" aria-hidden="true" />
      <div className="font-display text-[28px] font-extrabold uppercase leading-[0.95]">{title}</div>
      {children && <div className="font-typed text-[12px] leading-[1.6] text-paper/65 group-hover:text-ink/70">{children}</div>}
    </>
  );
  if (href) return <Link href={href} className={cls}>{inner}</Link>;
  return <div className={cls}>{inner}</div>;
}

const SYSTEM_RANK = new Map<string, number>(TYPING_SYSTEMS.map((s, i) => [s.slug, i]));

/** Order a list of reads the way the site orders its systems (MBTI first, then Enneagram, and so on). Unknown systems keep their place at the end. */
export function bySystemOrder<T extends { typingSystem: { slug: string } }>(list: T[]): T[] {
  return [...list].sort((a, b) => (SYSTEM_RANK.get(a.typingSystem.slug) ?? 99) - (SYSTEM_RANK.get(b.typingSystem.slug) ?? 99));
}

/** The consensus read among the reads of ONE system on one file: of those carrying any vote, the one most readers agreed with. Null while no read of that system has a vote. The profile stamp and the reader file's consensus column both use this rule. */
export function leadingRead<T extends { votes: { voteValue: number }[] }>(list: T[]): T | null {
  const voted = list.filter((t) => t.votes.length > 0);
  if (voted.length === 0) return null;
  const agreed = (t: T) => t.votes.filter((v) => v.voteValue > 0).length;
  return [...voted].sort((a, b) => agreed(b) - agreed(a))[0];
}
