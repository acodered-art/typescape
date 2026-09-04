import Link from "next/link";
import { prisma } from "@/lib/db";
import { ProfileCard } from "@/components/profile-card";
import { TypingBadge } from "@/components/typing-badge";
import { StreaksAndChallenges } from "@/components/streaks/streaks-display";
import { Btn, FileCard, InkTag, NavyCard, SectionHead, SegBar, bySystemOrder } from "@/components/dossier";

type Typing = { typingSystem: { name: string; slug: string }; typeValue: string; confidence: number };
type ListProfile = { name: string; slug: string; imageUrl: string | null; description: string | null; category: { name: string; slug: string } | null; typings: Typing[] };
type Category = { name: string; slug: string; _count: { profiles: number }; children: { name: string; slug: string; _count: { profiles: number } }[] };
type Stats = { profiles: number; typings: number; votes: number; users: number; comments: number };

/** A most-viewed file on the board: the system with the most readers, its leading and runner-up reads, the readers behind them. */
type BoardRow = {
  name: string;
  slug: string;
  imageUrl: string | null;
  series: string | null;
  system: { name: string; slug: string } | null;
  chips: { code: string; systemSlug: string; systemName: string }[];
  lead: { code: string; pct: number } | null;
  runner: { code: string; pct: number } | null;
  readers: number;
  disputed: boolean;
};

type BoardSource = {
  name: string;
  slug: string;
  imageUrl: string | null;
  category: { name: string; slug: string } | null;
  typings: { typeValue: string; typingSystem: { name: string; slug: string }; votes: { userId: string; voteValue: number }[] }[];
};

async function getJson<T>(url: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

/** Reads per type inside the system with the most readers. Reads are the upvotes on a typing; readers are distinct voters. */
function boardRow(p: BoardSource): BoardRow {
  const systems = new Map<string, { name: string; slug: string; reads: Map<string, number>; readers: Set<string> }>();
  for (const t of p.typings) {
    const s = systems.get(t.typingSystem.slug) ?? { name: t.typingSystem.name, slug: t.typingSystem.slug, reads: new Map(), readers: new Set() };
    let n = s.reads.get(t.typeValue) ?? 0;
    for (const v of t.votes) {
      if (v.voteValue > 0) {
        n += 1;
        s.readers.add(v.userId);
      }
    }
    s.reads.set(t.typeValue, n);
    systems.set(s.slug, s);
  }
  const top = [...systems.values()].sort((a, b) => b.readers.size - a.readers.size)[0] ?? null;
  const chips = bySystemOrder(p.typings).slice(0, 3).map((t) => ({ code: t.typeValue, systemSlug: t.typingSystem.slug, systemName: t.typingSystem.name }));
  const base: BoardRow = { name: p.name, slug: p.slug, imageUrl: p.imageUrl, series: p.category?.name ?? null, system: null, chips, lead: null, runner: null, readers: 0, disputed: false };
  if (!top || top.readers.size === 0) return base;
  const total = [...top.reads.values()].reduce((a, b) => a + b, 0);
  const ranked = [...top.reads.entries()].filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]).map(([code, n]) => ({ code, pct: Math.round((n / total) * 100) }));
  const lead = ranked[0];
  const runner = ranked[1] ?? null;
  return {
    ...base,
    system: { name: top.name, slug: top.slug },
    chips: ranked.slice(0, 3).map((r) => ({ code: r.code, systemSlug: top.slug, systemName: top.name })),
    lead,
    runner,
    readers: top.readers.size,
    disputed: lead.pct < 60 || (runner !== null && lead.pct - runner.pct < 15),
  };
}

/** The most viewed files with their vote split, straight from the database: the detail API bumps viewCount on every GET, so a server render cannot use it. */
async function getBoard(): Promise<BoardRow[]> {
  try {
    const profiles = await prisma.profile.findMany({
      orderBy: { viewCount: "desc" },
      take: 4,
      select: {
        name: true,
        slug: true,
        imageUrl: true,
        category: { select: { name: true, slug: true } },
        typings: { select: { typeValue: true, typingSystem: { select: { name: true, slug: true } }, votes: { select: { userId: true, voteValue: true } } } },
      },
    });
    return profiles.map(boardRow);
  } catch {
    return [];
  }
}

async function getHomeData() {
  const base = "http://localhost:3002";
  const [stats, recentData, categories, board] = await Promise.all([
    getJson<Stats>(`${base}/api/stats`, { profiles: 0, typings: 0, votes: 0, users: 0, comments: 0 }),
    getJson<{ profiles: ListProfile[] }>(`${base}/api/profiles?limit=4&sort=recent`, { profiles: [] }),
    getJson<Category[]>(`${base}/api/categories`, []),
    getBoard(),
  ]);
  return { stats, recent: recentData.profiles || [], categories, board };
}

const count = (k: number, one: string, many = `${one}s`) => `${k} ${k === 1 ? one : many}`;

/** "16 files, 32 findings and 1 reader on the record." Zero counts are left out rather than printed. */
function onRecord(stats: Stats): string {
  const parts = [
    stats.profiles > 0 ? count(stats.profiles, "file") : null,
    stats.typings > 0 ? count(stats.typings, "finding") : null,
    stats.votes > 0 ? count(stats.votes, "vote") : null,
    stats.users > 0 ? count(stats.users, "reader") : null,
  ].filter((s): s is string => s !== null);
  if (parts.length === 0) return "Nothing on the record yet.";
  if (parts.length === 1) return `${parts[0]} on the record.`;
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]} on the record.`;
}

function categoryFiles(cat: Category): number {
  return cat._count.profiles + cat.children.reduce((sum, c) => sum + c._count.profiles, 0);
}

function SearchIcon({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-4-4" />
    </svg>
  );
}

function HeroFile({ row, className }: { row: BoardRow; className: string }) {
  return (
    <div className={`absolute ${className}`}>
      <FileCard
        href={`/profiles/${row.slug}`}
        name={row.name}
        series={row.series}
        aside={row.readers > 0 ? count(row.readers, "reader") : row.chips.length > 0 ? count(row.chips.length, "finding") : "no findings yet"}
        imageUrl={row.imageUrl}
        variant="desk"
        nameSize={30}
        chips={row.chips.length > 0 ? row.chips.map((c, i) => <TypingBadge key={`${c.systemSlug}-${c.code}`} systemSlug={c.systemSlug} systemName={c.systemName} typeValue={c.code} confidence={0} tone={i === 0 ? "blue" : "navy"} />) : undefined}
      >
        {row.disputed && <InkTag rotate={-6} className="absolute bottom-[6px] right-3">Disputed</InkTag>}
      </FileCard>
    </div>
  );
}

export default async function HomePage() {
  const { stats, recent, categories, board } = await getHomeData();
  const heroFiles = board.slice(0, 2);

  return (
    <div className="flex min-h-full flex-col">
      {/* The front of the cabinet: thesis, typed search, two files on the desk */}
      <section className="grid items-center gap-10 pb-11 pt-7 md:grid-cols-[minmax(0,1fr)_420px] md:pt-14">
        <div className="flex flex-col gap-[18px]">
          <h1 className="font-display text-[62px] font-extrabold uppercase leading-[0.92] tracking-[0.01em] md:text-[96px]">
            Personality,
            <br />
            on the record.
          </h1>
          <p className="max-w-[540px] text-[16px] leading-[1.5] text-paper/75 md:text-[19px]">
            How fictional characters and public figures are typed across 20 systems, with evidence attached and a vote on every reading.
          </p>
          <form action="/search" method="get" role="search" className="mt-1 flex max-w-[560px] md:mt-[10px]">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">Search the files</span>
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-navy md:left-4" />
              <input name="q" type="text" placeholder="Character, series, or type code" className="input-desk h-[50px] pl-9 text-[14px] md:h-14 md:pl-11 md:text-[16px]" />
            </label>
            <button type="submit" className="font-display h-[50px] shrink-0 bg-blue px-[18px] text-[20px] font-extrabold uppercase tracking-[0.12em] text-ink hover:bg-paper md:h-14 md:px-[26px] md:text-[22px]">
              Search
            </button>
          </form>
          <p className="font-typed text-[13px] text-paper/60">{onRecord(stats)}</p>
        </div>
        {heroFiles.length > 0 && (
          <div className="relative hidden h-[320px] md:block">
            <HeroFile row={heroFiles[0]} className="left-5 top-[30px] w-[300px] rotate-[3deg]" />
            {heroFiles[1] && <HeroFile row={heroFiles[1]} className="left-[90px] top-[130px] w-[320px] -rotate-[4deg]" />}
          </div>
        )}
      </section>

      {/* Recently opened */}
      {recent.length > 0 && (
        <section className="flex flex-col gap-[14px] pb-9">
          <SectionHead title="Recently opened" aside={<Link href="/search" className="text-blue underline hover:text-paper">Browse all files</Link>} />
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            {recent.map((p) => (
              <ProfileCard key={p.slug} name={p.name} slug={p.slug} imageUrl={p.imageUrl} description={p.description} category={p.category} typings={p.typings} variant="desk" />
            ))}
          </div>
        </section>
      )}

      {/* The board: most viewed files and how their readers split */}
      {board.length > 0 && (
        <section className="flex flex-col gap-[14px] pb-9">
          <SectionHead title="Most viewed" />
          <div className="on-paper border-t-4 border-blue bg-paper px-3 py-1 text-ink shadow-[0_12px_28px_rgba(0,0,0,0.45)] md:px-4 md:py-[6px]">
            {board.map((row, i) => (
              <div key={row.slug} className={`flex flex-col gap-2 py-[10px] md:grid md:grid-cols-[200px_110px_minmax(0,1fr)_110px_auto] md:items-center md:gap-4 md:py-3 ${i < board.length - 1 ? "border-b border-paper-2" : ""}`}>
                <div className="flex items-baseline justify-between gap-3 md:contents">
                  <Link href={`/profiles/${row.slug}`} className="font-display text-[22px] font-extrabold uppercase leading-none text-ink hover:text-navy md:text-[24px]">
                    {row.name}
                  </Link>
                  <span className="font-typed text-[12px] text-navy md:hidden">
                    {row.system ? `${row.system.name}, ` : ""}
                    {row.readers > 0 ? count(row.readers, "reader") : "no reads yet"}
                  </span>
                  <div className="hidden font-typed text-[13px] font-bold uppercase tracking-[0.1em] text-navy md:block">{row.system?.name ?? "On file"}</div>
                </div>
                {row.lead ? (
                  <SegBar lead={row.lead.pct} runner={row.runner?.pct} leadLabel={`${row.lead.code} ${row.lead.pct}%`} runnerLabel={row.runner ? `${row.runner.code} ${row.runner.pct}%` : undefined} />
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {row.chips.map((c, j) => (
                      <TypingBadge key={`${c.systemSlug}-${c.code}`} systemSlug={c.systemSlug} systemName={c.systemName} typeValue={c.code} confidence={0} tone={j === 0 ? "blue" : "navy"} />
                    ))}
                    {row.chips.length === 0 && <span className="font-typed text-[13px] text-steel-2">No reads on file.</span>}
                  </div>
                )}
                <div className="hidden whitespace-nowrap font-typed text-[13px] text-navy md:block">{row.readers > 0 ? count(row.readers, "reader") : "no reads yet"}</div>
                <div className="hidden items-center justify-end gap-3 md:flex">
                  {row.disputed && <InkTag>Disputed</InkTag>}
                  <Btn href={`/profiles/${row.slug}`} variant="small">Weigh in</Btn>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* The cabinet */}
      {categories.length > 0 && (
        <section className="flex flex-col gap-[14px] pb-10">
          <SectionHead title="The cabinet" />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {categories.map((cat) => {
              const files = categoryFiles(cat);
              return (
                <NavyCard key={cat.slug} href={`/categories/${cat.slug}`} title={cat.name}>
                  {cat.children.slice(0, 3).map((c) => (
                    <span key={c.slug} className="block truncate">{c.name}</span>
                  ))}
                  <span className="block">{files > 0 ? count(files, "file") : "no files yet"}</span>
                </NavyCard>
              );
            })}
          </div>
        </section>
      )}

      {/* Streaks and the daily challenge (signed-in readers only; the component decides) */}
      <div className="max-w-[420px] pb-10">
        <StreaksAndChallenges />
      </div>

      <footer className="mt-auto border-t border-navy pb-6 pt-[18px] font-typed text-[12px] tracking-[0.04em] text-paper/45">
        TypeScape is a community personality database. Not affiliated with any psychological organization.
      </footer>
    </div>
  );
}
