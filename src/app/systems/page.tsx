import { prisma } from "@/lib/db";
import { TYPING_SYSTEMS } from "@/lib/typing-systems";
import { Btn, PageTitle, RailRow, Section, SectionHead, Sheet, Typed } from "@/components/dossier";
import Link from "next/link";

type SystemDef = (typeof TYPING_SYSTEMS)[number];
type Option = { value: string; label: string; description?: string };
type Dimension = { name: string; options: Option[] };
type FacetGroup = { dimension: string; facets: Option[] };

/** Systems with a test of their own. */
const TESTS = new Set(["mbti", "enneagram"]);

const count = (k: number, one: string, many = `${one}s`) => `${k} ${k === 1 ? one : many}`;
/** The definitions join a name and a fragment with a dash; the file prints them as two fields. */
const plain = (s: string) => s.replace(/\s+—\s+/g, ", ");
/** "OPS (Objective Personality)" is filed as OPS; the parenthetical becomes the full name when the description has none. */
const shortName = (name: string) => name.replace(/\s*\(.*\)\s*$/, "").trim() || name;
const parenthetical = (name: string) => name.match(/\(([^)]+)\)\s*$/)?.[1] ?? null;

const isPending = (s: SystemDef) => (!s.types || s.types.length === 0) && (!("dimensions" in s) || !s.dimensions || s.dimensions.length === 0) && !("facets" in s);

/** Files (distinct characters) per system and per type, and reads (votes) per system, straight from the database. */
async function getArchive() {
  const files = new Map<string, Map<string, Set<string>>>();
  const reads = new Map<string, number>();
  try {
    const rows = await prisma.profileTyping.findMany({
      select: { profileId: true, typeValue: true, typingSystem: { select: { slug: true } }, _count: { select: { votes: true } } },
    });
    for (const r of rows) {
      const slug = r.typingSystem.slug;
      const byType = files.get(slug) ?? new Map<string, Set<string>>();
      const set = byType.get(r.typeValue) ?? new Set<string>();
      set.add(r.profileId);
      byType.set(r.typeValue, set);
      files.set(slug, byType);
      reads.set(slug, (reads.get(slug) ?? 0) + r._count.votes);
    }
  } catch {}
  return { files, reads };
}

function filesIn(files: Map<string, Map<string, Set<string>>>, slug: string): number {
  const all = new Set<string>();
  files.get(slug)?.forEach((set) => set.forEach((id) => all.add(id)));
  return all.size;
}

function splitDescription(s: SystemDef): { fullName: string; basis: string } {
  const i = s.description.indexOf(" — ");
  if (i > 0) return { fullName: s.description.slice(0, i), basis: s.description.slice(i + 3) };
  return { fullName: parenthetical(s.name) ?? s.name, basis: s.description };
}

export default async function SystemsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const wanted = (typeof sp.system === "string" ? sp.system : sp.system?.[0]) || "mbti";
  const { files, reads } = await getArchive();

  const known = TYPING_SYSTEMS.filter((s) => !isPending(s)).sort((a, b) => filesIn(files, b.slug) - filesIn(files, a.slug));
  const pending = TYPING_SYSTEMS.filter(isPending);
  const system = known.find((s) => s.slug === wanted) ?? known.find((s) => s.slug === "mbti") ?? known[0];
  const { fullName, basis } = splitDescription(system);
  const types = (system.types ?? []) as Option[];
  /** A system whose types carry a real paragraph (the Naranjogram subtypes) lists them with the text; the rest print as a grid of codes. */
  const described = types.some((t) => (t.description?.length ?? 0) > 80);
  const dimensions = ("dimensions" in system ? system.dimensions : undefined) as Dimension[] | undefined;
  const pairs = dimensions?.filter((d) => d.options.length === 2) ?? [];
  const scales = dimensions?.filter((d) => d.options.length !== 2) ?? [];
  const animals = ("animals" in system ? system.animals : undefined) as Option[] | undefined;
  const facets = ("facets" in system ? system.facets : undefined) as FacetGroup[] | undefined;
  const levels = ("levels" in system ? system.levels : undefined) as Option[] | undefined;
  const wings = ("wings" in system ? system.wings : undefined) as Option[] | undefined;
  const typed = filesIn(files, system.slug);
  const read = reads.get(system.slug) ?? 0;
  const byType = files.get(system.slug);

  const railRows = (
    <div className="flex flex-col gap-[3px]">
      {known.map((s) => {
        const n = filesIn(files, s.slug);
        return (
          <RailRow key={s.slug} href={`/systems?system=${s.slug}`} active={s.slug === system.slug} aside={n > 0 ? n : undefined}>
            {shortName(s.name)}
          </RailRow>
        );
      })}
    </div>
  );

  return (
    <div>
      <PageTitle title="The systems" aside={`${TYPING_SYSTEMS.length} on file. ${known.length} open for reads.`} />
      <div className="grid gap-7 md:grid-cols-[240px_minmax(0,1fr)] md:items-start">
        <aside className="flex flex-col gap-[22px]">
          <div className="flex flex-col gap-2">
            <SectionHead size={20} title="Open for reads" />
            <details className="group md:hidden">
              <summary className="rail-row cursor-pointer list-none">
                <span className="truncate">{shortName(system.name)}</span>
                <span className="text-paper/60">
                  <span className="group-open:hidden">{known.length} systems</span>
                  <span className="hidden group-open:inline">close</span>
                </span>
              </summary>
              <div className="mt-[3px]">{railRows}</div>
            </details>
            <div className="hidden md:block">{railRows}</div>
          </div>
          {pending.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-[10px]">
                <span className="sq bg-navy" />
                <h2 className="sec-h text-paper/70" style={{ fontSize: 20 }}>Pending research</h2>
              </div>
              <div className="flex flex-col gap-[3px]">
                {pending.map((s) => (
                  <RailRow key={s.slug} off aside="no type list">
                    {shortName(s.name)}
                  </RailRow>
                ))}
              </div>
              <p className="font-typed text-[13px] leading-[1.5] text-paper/60">Know one of these? Propose a type list and it opens for reads.</p>
            </div>
          )}
        </aside>

        <Sheet className="flex flex-col gap-5 px-8 pb-[26px] pt-[30px]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
            <div className="grid min-w-0 flex-1 grid-cols-[96px_minmax(0,1fr)] items-baseline gap-x-3 gap-y-[10px]">
              <div className="lab">System</div>
              <h1 className="font-display text-[44px] font-extrabold uppercase leading-[0.95] tracking-[0.01em] md:text-[64px]">{shortName(system.name)}</h1>
              <div className="lab">Full name</div>
              <div className="ln text-[16px]">{fullName}</div>
              <div className="lab">Basis</div>
              <div className="ln text-[16px] max-w-[520px]">{plain(basis)}</div>
            </div>
            {(typed > 0 || read > 0) && (
              <div className="shrink-0 font-typed text-[12px] leading-[1.7] text-navy sm:text-right">
                {typed > 0 && <>{count(typed, "file")} typed<br /></>}
                {read > 0 && <>{count(read, "read")}</>}
              </div>
            )}
          </div>

          {pairs.length > 0 && (
            <Section>
              <SectionHead title="Preference pairs" aside="A type is one pick from each pair" />
              <div className="grid gap-x-8 gap-y-[10px] md:grid-cols-2">
                {pairs.map((d) => (
                  <div key={d.name} className="grid grid-cols-[40px_minmax(0,1fr)_28px_40px_minmax(0,1fr)] items-center gap-2 text-[15px]">
                    <span className="border-2 border-navy py-[2px] text-center font-typed text-[16px] font-bold text-navy">{d.options[0].value}</span>
                    <span>{d.options[0].label}</span>
                    <span className="text-center font-typed text-[13px] text-steel-2">or</span>
                    <span className="border-2 border-navy py-[2px] text-center font-typed text-[16px] font-bold text-navy">{d.options[1].value}</span>
                    <span>{d.options[1].label}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {scales.length > 0 && (
            <Section>
              <SectionHead title="Dimensions" aside="Each read places the character on every scale" />
              <div className="grid gap-[10px] sm:grid-cols-2 md:grid-cols-3">
                {scales.map((d) => (
                  <div key={d.name} className="row-fill flex flex-col gap-1 px-3 py-[10px]">
                    <span className="font-display text-[19px] font-bold uppercase tracking-[0.06em]">{d.name}</span>
                    <Typed className="text-[12px]">{d.options.map((o) => o.label).join(", ")}</Typed>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {types.length > 0 && described && (
            <Section>
              <SectionHead title="Types" aside={`${count(types.length, "type")}. Files in the archive per type.`} />
              <div className="flex flex-col gap-[10px]">
                {types.map((t) => {
                  const n = byType?.get(t.value)?.size ?? 0;
                  const name = t.label.split(" — ")[1] ?? "";
                  return (
                    <div key={t.value} className={`flex flex-col gap-2 px-4 py-3 ${n > 0 ? "row-fill" : "dashed"}`}>
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <Link href={`/search?type=${encodeURIComponent(t.value)}&system=${system.slug}`} className="font-typed text-[22px] font-bold text-ink hover:text-navy">
                          {t.value}
                        </Link>
                        {name && <span className="font-display text-[19px] font-bold uppercase tracking-[0.06em] text-navy">{name}</span>}
                        <span className={`ml-auto font-typed text-[12px] ${n > 0 ? "text-navy" : "text-steel-2"}`}>{n > 0 ? count(n, "file") : "no files yet"}</span>
                      </div>
                      <p className="max-w-[720px] text-[14px] leading-[1.5]">{t.description}</p>
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          {types.length > 0 && !described && (
            <Section>
              <SectionHead title="Types" aside={`${count(types.length, "type")}. Files in the archive per type.`} />
              <div className="grid grid-cols-2 gap-[10px] md:grid-cols-4">
                {types.map((t) => {
                  const n = byType?.get(t.value)?.size ?? 0;
                  return n > 0 ? (
                    <Link key={t.value} href={`/search?type=${encodeURIComponent(t.value)}&system=${system.slug}`} className="row-fill flex flex-col gap-1 px-3 py-[10px] text-ink hover:bg-blue" title={plain(t.label)}>
                      <span className="font-typed text-[22px] font-bold">{t.value}</span>
                      <span className="font-typed text-[12px] text-navy">{count(n, "file")}</span>
                    </Link>
                  ) : (
                    <Link key={t.value} href={`/search?type=${encodeURIComponent(t.value)}&system=${system.slug}`} className="dashed flex flex-col gap-1 px-[11px] py-[9px] text-steel-2 hover:border-navy hover:text-navy" title={plain(t.label)}>
                      <span className="font-typed text-[22px] font-bold">{t.value}</span>
                      <span className="font-typed text-[12px]">no files yet</span>
                    </Link>
                  );
                })}
              </div>
            </Section>
          )}

          {wings && wings.length > 0 && (
            <Section>
              <SectionHead title="Wings" />
              <Typed className="text-[14px]">A read may carry a wing after the type, written {wings[0].value} to {wings[wings.length - 1].value}, as in 5w4.</Typed>
            </Section>
          )}

          {animals && animals.length > 0 && (
            <Section>
              <SectionHead title="Animals" aside={`${count(animals.length, "animal")} in the stack`} />
              <div className="grid gap-[10px] sm:grid-cols-2">
                {animals.map((a) => (
                  <div key={a.value} className="row-fill flex flex-col gap-1 px-3 py-[10px]">
                    <span className="font-typed text-[16px] font-bold">{a.label}</span>
                    {a.description && <span className="text-[13px] leading-[1.45]">{plain(a.description)}</span>}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {facets && facets.length > 0 && (
            <Section>
              <SectionHead title="Facets" aside={`${facets.reduce((s, f) => s + f.facets.length, 0)} facets across ${count(facets.length, "dimension")}`} />
              <div className="flex flex-col gap-[10px]">
                {facets.map((f) => (
                  <div key={f.dimension} className="grid gap-1 border-b border-paper-2 pb-[10px] md:grid-cols-[180px_minmax(0,1fr)] md:gap-4">
                    <span className="font-display text-[19px] font-bold uppercase tracking-[0.06em]">{f.dimension}</span>
                    <Typed className="leading-[1.5]">{f.facets.map((x) => x.label).join(", ")}</Typed>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {levels && levels.length > 0 && (
            <Section>
              <SectionHead title="Levels of health" />
              <Typed className="text-[14px] leading-[1.5]">
                Every type is read at one of {levels.length} levels, from {plain(levels[0].label)} down to {plain(levels[levels.length - 1].label)}.
              </Typed>
            </Section>
          )}

          <div className="flex flex-col-reverse gap-3 border-t-2 border-ink pt-[18px] sm:flex-row sm:justify-end">
            {TESTS.has(system.slug) && <Btn href={`/test/${system.slug}`}>Take the test</Btn>}
            <Btn variant="primary" href={`/search?system=${system.slug}`}>
              Browse {shortName(system.name)} files
            </Btn>
          </div>
        </Sheet>
      </div>
    </div>
  );
}
