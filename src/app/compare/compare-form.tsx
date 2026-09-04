"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { TYPING_SYSTEMS } from "@/lib/typing-systems";
import { getCorrelations } from "@/lib/correlations";
import { Btn, CodeChip, EmptySlot, Sheet, Typed } from "@/components/dossier";
import { SelectPaper } from "@/components/dossier/modal";

interface CompareResult {
  type1: { type: string; system: string; count: number; examples: { name: string; slug: string }[] };
  type2: { type: string; system: string; count: number; examples: { name: string; slug: string }[] };
  sharedProfiles: number;
  commonProfiles: { name: string; slug: string }[];
}

type Picks = { system1: string; type1: string; system2: string; type2: string };

const SYSTEMS = TYPING_SYSTEMS.filter((s) => s.types?.length);
const shortName = (name: string) => name.replace(/\s*\(.*\)\s*$/, "").trim() || name;
const WORDS = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];
const filesInWords = (n: number) => `${n <= 10 ? WORDS[n] : n} ${n === 1 ? "file" : "files"}`;
const count = (k: number, one: string, many = `${one}s`) => `${k} ${k === 1 ? one : many}`;

/** "ENNEAGRAM, THE INVESTIGATOR": the Enneagram adds the type's name after the system. */
function systemLabel(systemSlug: string, type: string): string {
  const sys = SYSTEMS.find((s) => s.slug === systemSlug);
  const name = sys ? shortName(sys.name) : systemSlug;
  if (systemSlug !== "enneagram") return name;
  const label = sys?.types?.find((t) => t.value === type)?.label ?? "";
  const after = label.split(" — ")[1];
  return after ? `${name}, ${after}` : name;
}

const typeWord = (systemSlug: string, type: string) => (systemSlug === "enneagram" ? `type ${type}` : type);

function howOften(strength: number): string {
  const pct = Math.round(strength * 100);
  if (pct === 50) return "half the time";
  if (pct === 33 || pct === 34) return "one time in three";
  if (pct === 25) return "one time in four";
  if (pct === 20) return "one time in five";
  if (pct === 10) return "one time in ten";
  return `${pct}% of the time`;
}

/** The site's correlation table, read for the first pick and narrowed to the second system; the chosen second type comes first. */
function correlationSentence(p: Picks): string | null {
  const related = getCorrelations(p.system1, p.type1).filter((c) => c.targetSystem === p.system2);
  if (related.length === 0) return null;
  const chosen = related.find((c) => c.targetType === p.type2);
  const list = [...(chosen ? [chosen] : []), ...related.filter((c) => c !== chosen)].slice(0, 2);
  const parts = list.map((c, i) => `${i === 0 ? "" : "and with "}${typeWord(p.system2, c.targetType)} ${howOften(c.strength)}`);
  return `The site's correlation table pairs ${p.type1} with ${parts.join(", ")}.`;
}

/** The requisition strip on the desk and, once the files are pulled, the sheet: each read's files at the sides, the files carrying both in the middle. */
export default function CompareForm({ initial }: { initial: Picks }) {
  const [system1, setSystem1] = useState(initial.system1);
  const [type1, setType1] = useState(initial.type1);
  const [system2, setSystem2] = useState(initial.system2);
  const [type2, setType2] = useState(initial.type2);
  const [result, setResult] = useState<CompareResult | null>(null);
  const [picks, setPicks] = useState<Picks | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const sys1 = SYSTEMS.find((s) => s.slug === system1);
  const sys2 = SYSTEMS.find((s) => s.slug === system2);

  const pull = async (p: Picks) => {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch(`/api/compare?type1=${encodeURIComponent(p.type1)}&system1=${p.system1}&type2=${encodeURIComponent(p.type2)}&system2=${p.system2}`);
      if (res.ok) {
        setResult(await res.json());
        setPicks(p);
      } else setError("The files could not be pulled.");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  // A link with both reads in the address pulls the files on arrival.
  useEffect(() => {
    if (!initial.type1 || !initial.type2) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/compare?type1=${encodeURIComponent(initial.type1)}&system1=${initial.system1}&type2=${encodeURIComponent(initial.type2)}&system2=${initial.system2}`);
        if (cancelled) return;
        if (res.ok) {
          setResult(await res.json());
          setPicks(initial);
        } else setError("The files could not be pulled.");
      } catch {
        if (!cancelled) setError("Network error");
      }
    })();
    return () => { cancelled = true; };
  }, [initial]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!type1 || !type2) return;
    pull({ system1, type1, system2, type2 });
  };

  const readPicker = (label: string, system: string, type: string, sys: typeof sys1, onSystem: (v: string) => void, onType: (v: string) => void) => (
    <div className="flex flex-col gap-2">
      <span className="font-display text-[15px] font-bold uppercase tracking-[0.1em] text-paper/80">{label}</span>
      <div className="flex gap-2">
        <SelectPaper value={system} onChange={(e) => { onSystem(e.target.value); onType(""); }} aria-label={`${label}, system`} className="flex-1 border-0">
          {SYSTEMS.map((s) => (
            <option key={s.slug} value={s.slug}>{shortName(s.name)}</option>
          ))}
        </SelectPaper>
        <SelectPaper value={type} onChange={(e) => onType(e.target.value)} aria-label={`${label}, type`} className={`flex-1 border-0 ${type ? "font-bold" : ""}`}>
          <option value="">Type</option>
          {sys?.types?.map((t) => (
            <option key={t.value} value={t.value}>{t.value}</option>
          ))}
        </SelectPaper>
      </div>
    </div>
  );

  const side = (r: CompareResult["type1"]) => (
    <div className="flex min-w-0 flex-col gap-[10px]">
      <div className="font-typed text-[48px] font-bold leading-none">{r.type}</div>
      <div className="lab">{systemLabel(r.system, r.type)}</div>
      <div className="ln text-[15px]">{r.count === 0 ? "No file carries this read" : `${count(r.count, "file")} ${r.count === 1 ? "carries" : "carry"} this read`}</div>
      {r.examples.length > 0 && (
        <div className="mt-[6px] flex flex-col">
          {r.examples.map((p, i) => (
            <Link key={p.slug} href={`/profiles/${p.slug}`} className={`py-[9px] font-display text-[22px] font-extrabold uppercase leading-none text-ink hover:text-navy ${i < r.examples.length - 1 ? "border-b border-paper-2" : ""}`}>
              {p.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  );

  const sentence = picks ? correlationSentence(picks) : null;

  return (
    <div className="flex flex-col gap-7">
      <form onSubmit={handleSubmit} className="grid gap-5 bg-navy px-6 pb-[22px] pt-5 md:grid-cols-[minmax(0,1fr)_80px_minmax(0,1fr)_auto] md:items-end">
        {readPicker("First read", system1, type1, sys1, setSystem1, setType1)}
        <div className="text-center font-typed text-[14px] text-paper/70 md:pb-3">against</div>
        {readPicker("Second read", system2, type2, sys2, setSystem2, setType2)}
        <Btn type="submit" variant="primary" disabled={loading || !type1 || !type2}>
          {loading ? "Pulling" : "Pull the files"}
        </Btn>
      </form>

      {error && <p className="font-typed text-[13px] text-paper/70">{error}</p>}
      {loading && !error && <p className="font-typed text-[13px] text-paper/70">Pulling the files.</p>}

      {result && picks && (
        <Sheet className="grid items-start gap-7 px-8 pb-7 pt-[30px] md:grid-cols-[minmax(0,1fr)_340px_minmax(0,1fr)]">
          {side(result.type1)}
          <div className="row-fill order-last flex flex-col gap-3 px-[18px] pb-4 pt-[18px] md:order-none">
            <span className="lab">Filed under both</span>
            <div className="font-display text-[44px] font-extrabold uppercase leading-[0.95]">{filesInWords(result.commonProfiles.length)}</div>
            {result.commonProfiles.length === 0 ? (
              <EmptySlot>No file carries both reads yet. Be the first to read one that way.</EmptySlot>
            ) : (
              result.commonProfiles.map((p) => (
                <div key={p.slug} className="flex flex-col gap-2 border border-steel bg-paper px-3 pb-[14px] pt-3">
                  <Link href={`/profiles/${p.slug}`} className="font-display text-[26px] font-extrabold uppercase leading-[0.95] text-ink hover:text-navy">
                    {p.name}
                  </Link>
                  <div className="flex flex-wrap gap-[6px]">
                    <CodeChip href={`/search?type=${encodeURIComponent(picks.type1)}&system=${picks.system1}`}>{picks.type1}</CodeChip>
                    <CodeChip href={`/search?type=${encodeURIComponent(picks.type2)}&system=${picks.system2}`}>{picks.type2}</CodeChip>
                  </div>
                </div>
              ))
            )}
            {sentence && <Typed className="border-t border-ink pt-[10px] leading-[1.5]">{sentence}</Typed>}
            <Link href={`/search?type=${encodeURIComponent(picks.type1)}&system=${picks.system1}`} className="font-typed text-[13px] underline">
              Open {picks.type1} in Browse
            </Link>
          </div>
          {side(result.type2)}
        </Sheet>
      )}
    </div>
  );
}
