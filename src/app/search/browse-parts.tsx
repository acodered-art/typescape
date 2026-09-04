import Link from "next/link";
import type { ReactNode } from "react";
import { ProfileCard } from "@/components/profile-card";
import { Btn, CodeChip, EmptySlot, FolderTab, RailRow, SectionHead, Sheet } from "@/components/dossier";

/* Browse vocabulary shared by /search and /categories: the cabinet rail, sort tabs on the sheet's edge, files on a sheet. */

export type BrowseProfile = {
  name: string;
  slug: string;
  imageUrl: string | null;
  description: string | null;
  category: { name: string; slug: string } | null;
  typings: { typingSystem: { name: string; slug: string }; typeValue: string; confidence: number }[];
};

export type FacetType = { typeValue: string; systemSlug: string; systemName: string; count: number };

export const SORTS = [
  { key: "views", label: "Most viewed" },
  { key: "recent", label: "Newest" },
  { key: "name", label: "Name" },
] as const;

export type Drawer = { href: string; label: string; count?: number; active: boolean };

/** The cabinet: "All files" then one drawer per category. Past `moreAfter` rows the rest fold behind "n more drawers"; on phones the whole list folds behind the active drawer. */
export function Cabinet({ all, rows, moreAfter = 7 }: { all: Drawer; rows: Drawer[]; moreAfter?: number }) {
  const first = rows.slice(0, moreAfter);
  const rest = rows.slice(moreAfter);
  const row = (r: Drawer) => (
    <RailRow key={r.href} href={r.href} active={r.active} aside={r.count}>
      {r.label}
    </RailRow>
  );
  const list = (
    <div className="flex flex-col gap-[3px]">
      {row(all)}
      {first.map(row)}
      {rest.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer list-none px-3 py-2 font-typed text-[13px] text-blue underline hover:text-paper">
            <span className="group-open:hidden">{rest.length} more drawers</span>
            <span className="hidden group-open:inline">Fewer drawers</span>
          </summary>
          <div className="flex flex-col gap-[3px]">{rest.map(row)}</div>
        </details>
      )}
    </div>
  );
  const open = rows.find((r) => r.active) ?? all;
  return (
    <div className="flex flex-col gap-2">
      <SectionHead size={20} title="Cabinet" />
      <details className="group md:hidden">
        <summary className="rail-row cursor-pointer list-none">
          <span className="truncate">{open.label}</span>
          <span className="text-paper/60">
            <span className="group-open:hidden">{rows.length + 1} drawers</span>
            <span className="hidden group-open:inline">close</span>
          </span>
        </summary>
        <div className="mt-[3px]">{list}</div>
      </details>
      <div className="hidden md:block">{list}</div>
    </div>
  );
}

/** Popular types as chips: the three most used in blue, the rest paper on navy; the selected one filled. Counts ride in normal weight. */
export function PopularTypes({ types, currentType, currentSystem, hrefFor }: { types: FacetType[]; currentType: string; currentSystem: string; hrefFor: (t: FacetType) => string }) {
  if (types.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <SectionHead size={20} title="Popular types" />
      <div className="flex flex-wrap gap-[6px]">
        {types.map((t, i) => {
          const active = currentType === t.typeValue && currentSystem === t.systemSlug;
          return (
            <CodeChip key={`${t.systemSlug}-${t.typeValue}`} href={hrefFor(t)} tone={i < 3 ? "blue" : "paper"} title={`${t.typeValue}, ${t.systemName}`} className={`px-2 py-[3px] ${active ? "bg-blue text-ink" : ""}`}>
              {t.typeValue} <span className={`font-normal ${active ? "text-ink/70" : "text-paper/60"}`}>{t.count}</span>
            </CodeChip>
          );
        })}
      </div>
    </div>
  );
}

/** A block of removable chips describing the current search (query, type, category, system). */
export function ThisSearch({ filters }: { filters: { label: string; href: string }[] }) {
  if (filters.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <SectionHead size={20} title="This search" />
      <div className="flex flex-wrap gap-[6px]">
        {filters.map((f) => (
          <Link key={`${f.label}-${f.href}`} href={f.href} className="chip chip-paper px-2 py-[3px]" title="Remove from this search">
            {f.label} <span className="font-normal text-paper/60">×</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

/** Sort tabs on the sheet's top edge, the small "+ New file" button at the right. */
export function SortTabs({ sort, hrefFor, newHref }: { sort: string; hrefFor: (key: string) => string; newHref: string }) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div className="flex items-end gap-1 overflow-x-auto">
        {SORTS.map((s) => (
          <FolderTab key={s.key} href={hrefFor(s.key)} active={sort === s.key}>
            {s.label}
          </FolderTab>
        ))}
      </div>
      <Btn href={newHref} variant="small" className="mb-[6px] shrink-0">
        + New file
      </Btn>
    </div>
  );
}

/** Files on the sheet, three across (two on tablets, one on phones), or the empty slot that says what to do. */
export function FileSheet({ profiles, empty }: { profiles: BrowseProfile[]; empty: ReactNode }) {
  return (
    <Sheet className="p-5">
      {profiles.length === 0 ? (
        <EmptySlot>{empty}</EmptySlot>
      ) : (
        <div className="grid gap-[14px] sm:grid-cols-2 lg:grid-cols-3">
          {profiles.map((p) => (
            <ProfileCard key={p.slug} name={p.name} slug={p.slug} imageUrl={p.imageUrl} description={p.description} category={p.category} typings={p.typings} variant="sheet" />
          ))}
        </div>
      )}
    </Sheet>
  );
}

export function ShowMore({ href, n }: { href: string; n: number }) {
  return (
    <Btn href={href} variant="small" className="mt-[18px] self-center px-[18px] py-[9px] tracking-[0.12em]">
      Show {n} more {n === 1 ? "file" : "files"}
    </Btn>
  );
}
