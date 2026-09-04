"use client";
import { useEffect, useState } from "react";
import { DisorderVotePanel } from "@/components/disorder-vote-panel";
import { Section, SectionHead, Typed } from "@/components/dossier";
import { FormNote } from "@/components/dossier/modal";

interface Trait {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  lowLabel: string;
  highLabel: string;
  sortOrder: number;
}

interface TraitAverage {
  traitId: string;
  traitSlug: string;
  avg: number;
  count: number;
}

interface BreakdownEntry {
  disorderId: string;
  disorderName: string;
  disorderSlug: string;
  cluster: string;
  similarity: number;
  distance: number;
  percentage: number;
}

interface VoteData {
  totalVoters: number;
  traits: TraitAverage[];
  communityVector: number[];
  myVector: number[];
  myVotes: { traitId: string; value: number }[];
  breakdown: BreakdownEntry[];
  autoNone: boolean;
  description: string;
}

const count = (k: number, one: string, many = `${one}s`) => `${k} ${k === 1 ? one : many}`;

/* ---- The map. The patterns sit evenly on an ellipse, grouped by DSM cluster (A, then B, then C, then none); the
   rings around each one show how closely the community survey matches it, and the crosshair sits between the
   closest patterns. It is a layout of the similarity table, not a projection of the survey vectors. ---- */
const MAP_W = 558;
const MAP_H = 278;
const CLUSTER_ORDER: Record<string, number> = { A: 0, B: 1, C: 2 };

type Placed = BreakdownEntry & { x: number; y: number; rank: number; label: string };

/** "Obsessive-Compulsive Personality Disorder" prints as OBSESSIVE-COMPULSIVE; the no-pattern entry as NONE. */
function shortName(name: string): string {
  const short = name.replace(/\s*personality disorder\s*/i, "").replace(/\s*\/\s*other/i, "").trim();
  return (short || name).toUpperCase();
}

function placePatterns(breakdown: BreakdownEntry[]): Placed[] {
  const byPct = [...breakdown].sort((a, b) => b.percentage - a.percentage);
  const rank = new Map(byPct.map((b, i) => [b.disorderId, i]));
  const ordered = [...breakdown].sort((a, b) => (CLUSTER_ORDER[a.cluster] ?? 3) - (CLUSTER_ORDER[b.cluster] ?? 3));
  const n = Math.max(1, ordered.length);
  const cx = MAP_W / 2;
  const cy = MAP_H / 2;
  return ordered.map((b, i) => {
    const angle = -Math.PI / 2 + (i / n) * Math.PI * 2;
    return { ...b, x: cx + 215 * Math.cos(angle), y: cy + 100 * Math.sin(angle), rank: rank.get(b.disorderId) ?? 99, label: shortName(b.disorderName) };
  });
}

function rings(pct: number): number {
  if (pct >= 30) return 4;
  if (pct >= 20) return 3;
  if (pct >= 10) return 2;
  return pct > 0 ? 1 : 0;
}

function TraitMap({ breakdown, surveyed }: { breakdown: BreakdownEntry[]; surveyed: number }) {
  const placed = placePatterns(breakdown);
  const top = [...placed].sort((a, b) => a.rank - b.rank).slice(0, 3).filter((p) => p.percentage > 0);
  const weight = top.reduce((s, p) => s + p.percentage, 0);
  const cross = surveyed > 0 && weight > 0 ? { x: top.reduce((s, p) => s + p.x * p.percentage, 0) / weight, y: top.reduce((s, p) => s + p.y * p.percentage, 0) / weight } : null;
  const stroke = (rank: number) => (rank <= 1 ? "stroke-blue" : rank === 2 ? "stroke-steel" : "stroke-navy");
  const fill = (rank: number) => (surveyed === 0 ? "fill-steel" : rank <= 1 ? "fill-blue" : rank === 2 ? "fill-steel-2" : "fill-navy");
  return (
    <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} width="100%" className="block" role="img" aria-label={surveyed > 0 ? `Trait space map. Closest patterns: ${top.map((p) => p.label).join(", ")}.` : "Trait space map with no surveys yet."}>
      <defs>
        <pattern id="trait-grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M20 0H0V20" fill="none" className="stroke-navy" strokeOpacity="0.12" />
        </pattern>
      </defs>
      <rect width={MAP_W} height={MAP_H} fill="url(#trait-grid)" />
      {surveyed > 0 &&
        placed.map((p) => {
          const n = rings(p.percentage);
          return (
            <g key={p.disorderId} fill="none" className={stroke(p.rank)} strokeWidth={p.rank === 2 ? 2 : 1.5}>
              {Array.from({ length: n }, (_, k) => (
                <ellipse key={k} cx={p.x} cy={p.y} rx={20 + k * 20} ry={13 + k * 13} strokeOpacity={Math.max(0.15, 0.9 - k * 0.22)} />
              ))}
            </g>
          );
        })}
      <g fontWeight="700" fontSize="12" letterSpacing="1.4" style={{ fontFamily: "var(--font-display)", fontVariationSettings: '"opsz" 72' }}>
        {placed.map((p) => (
          <text key={p.disorderId} x={p.x} y={p.y + 4} textAnchor="middle" className={fill(p.rank)}>
            {p.label}
          </text>
        ))}
      </g>
      {cross && (
        <g>
          <g className="stroke-ink" strokeWidth="1.5" fill="none">
            <line x1={cross.x - 20} y1={cross.y} x2={cross.x + 20} y2={cross.y} />
            <line x1={cross.x} y1={cross.y - 20} x2={cross.x} y2={cross.y + 20} />
            <circle cx={cross.x} cy={cross.y} r="7" />
          </g>
          <text x={cross.x + 8} y={cross.y + 32} fontSize="10" fontWeight="700" letterSpacing="1" className="fill-ink" style={{ fontFamily: "var(--font-typed)" }}>
            COMMUNITY READ
          </text>
        </g>
      )}
    </svg>
  );
}

/** Seven boxes from -3 to +3; the community's rounded average is the filled one. */
function TraitBoxes({ avg }: { avg: number }) {
  const filled = Math.max(-3, Math.min(3, Math.round(avg))) + 3;
  return (
    <div className="flex gap-[5px]" aria-hidden="true">
      {Array.from({ length: 7 }, (_, i) => (
        <span key={i} className={`h-[11px] w-[11px] border ${i === filled ? "border-blue bg-blue" : "border-navy"}`} />
      ))}
    </div>
  );
}

const signed = (v: number) => `${v > 0 ? "+" : ""}${v.toFixed(1)}`;

/**
 * "Trait space": the community's 12-axis survey drawn as a map of the DSM patterns it resembles, the nearest patterns
 * as bars, the strongest traits as boxes. "Survey this character" reveals the survey itself (one vote per trait per
 * reader, toggled off by voting the same value) and the direct pattern vote.
 */
export function TraitVotePanel({ profileSlug }: { profileSlug: string }) {
  const [traits, setTraits] = useState<Trait[]>([]);
  const [voteData, setVoteData] = useState<VoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState("");
  const [surveying, setSurveying] = useState(false);

  const fetchData = async () => {
    try {
      const [tRes, vRes] = await Promise.all([fetch("/api/traits"), fetch(`/api/profiles/${profileSlug}/trait-votes`)]);
      if (tRes.ok) setTraits(await tRes.json());
      if (vRes.ok) setVoteData(await vRes.json());
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [tRes, vRes] = await Promise.all([fetch("/api/traits"), fetch(`/api/profiles/${profileSlug}/trait-votes`)]);
      if (cancelled) return;
      if (tRes.ok) setTraits(await tRes.json());
      if (vRes.ok) setVoteData(await vRes.json());
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [profileSlug]);

  const handleVote = async (traitId: string, value: number) => {
    setVoting((prev) => ({ ...prev, [traitId]: true }));
    setMessage("");
    try {
      const res = await fetch(`/api/profiles/${profileSlug}/trait-votes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ traitId, value }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessage(data.action === "removed" ? "Vote withdrawn." : "Vote filed.");
        fetchData();
        setTimeout(() => setMessage(""), 2000);
      } else {
        const data = await res.json();
        setMessage(res.status === 401 ? "Sign in to survey a character." : data.error || "Failed");
      }
    } catch {
      setMessage("Network error");
    } finally {
      setVoting((prev) => ({ ...prev, [traitId]: false }));
    }
  };

  const myVoteMap = new Map<string, number>();
  voteData?.myVotes.forEach((v) => myVoteMap.set(v.traitId, v.value));
  const avgMap = new Map<string, number>();
  voteData?.traits.forEach((t) => avgMap.set(t.traitId, t.avg));

  const surveyed = voteData?.totalVoters ?? 0;
  const nearest = voteData ? [...voteData.breakdown].sort((a, b) => b.percentage - a.percentage).filter((b) => b.percentage > 0).slice(0, 3) : [];
  const strongest = traits
    .map((t) => ({ trait: t, avg: avgMap.get(t.id) ?? 0 }))
    .filter((x) => Math.abs(x.avg) > 0)
    .sort((a, b) => Math.abs(b.avg) - Math.abs(a.avg))
    .slice(0, 4);
  const failed = message === "Failed" || message === "Network error" || message.startsWith("Sign in");
  const readSentence = voteData?.autoNone || nearest.length === 0
    ? "No pattern stands out yet."
    : nearest.length === 1
      ? `Reads as ${nearest[0].disorderName.toUpperCase()}.`
      : `Reads as ${nearest[0].disorderName.toUpperCase()} with ${/^[AEIOU]/i.test(nearest[1].disorderName) ? "an" : "a"} ${nearest[1].disorderName.toUpperCase()} accent.`;

  return (
    <Section className="grid gap-7 md:grid-cols-[560px_minmax(0,1fr)]">
      <div className="flex flex-col gap-[10px]">
        <SectionHead title="Trait space" aside={loading ? "Opening the survey" : surveyed > 0 ? `${count(surveyed, "reader")} surveyed` : "No surveys yet"} />
        <div className="border border-ink">
          <TraitMap breakdown={voteData?.breakdown ?? []} surveyed={surveyed} />
        </div>
        <Typed className="text-[12px] leading-[1.5]">
          {surveyed > 0
            ? "Rings show how closely the community survey matches each pattern. The crosshair sits between the closest ones."
            : "The map fills in as readers survey this character across twelve traits."}
        </Typed>
      </div>

      <div className="flex flex-col gap-[10px]">
        {surveyed > 0 && nearest.length > 0 && (
          <>
            <div className="font-display text-[20px] font-extrabold uppercase tracking-[0.12em]">Nearest pattern</div>
            {nearest.map((b, i) => (
              <div key={b.disorderId} className="grid grid-cols-[120px_minmax(0,1fr)_40px] items-center gap-[10px] text-[14px]">
                <span className="truncate" title={b.disorderName}>{b.disorderName}</span>
                <div className="h-2 bg-paper-2">
                  <div className={`h-2 ${i < 2 ? "bg-blue" : "bg-steel"}`} style={{ width: `${Math.min(100, b.percentage)}%` }} />
                </div>
                <span className={`text-right font-typed text-[13px] ${i < 2 ? "font-bold text-blue" : "text-navy"}`}>{b.percentage}%</span>
              </div>
            ))}
            <div className="border-t border-ink pt-[10px] font-typed text-[14px] leading-[1.5]">{readSentence}</div>
            {voteData?.description && <p className="text-[14px] leading-[1.5]">{voteData.description}</p>}
          </>
        )}

        {strongest.length > 0 && (
          <>
            <div className="mt-2 font-display text-[20px] font-extrabold uppercase tracking-[0.12em]">Strongest traits</div>
            {strongest.map(({ trait, avg }) => (
              <div key={trait.id} className="grid grid-cols-[130px_minmax(0,1fr)_44px] items-center gap-[10px] text-[14px]">
                <span className="truncate" title={`${trait.lowLabel} to ${trait.highLabel}`}>{trait.name}</span>
                <TraitBoxes avg={avg} />
                <span className="text-right font-typed text-[13px]">{signed(avg)}</span>
              </div>
            ))}
          </>
        )}

        <Typed className="mt-1">
          {traits.length > strongest.length && `${count(traits.length - strongest.length, "more trait")} on file. `}
          <button type="button" onClick={() => setSurveying((s) => !s)} className="text-blue underline hover:text-navy" aria-expanded={surveying}>
            {surveying ? "Close the survey" : "Survey this character"}
          </button>
        </Typed>
      </div>

      {surveying && (
        <div className="flex flex-col gap-5 border-t border-steel pt-4 md:col-span-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="lab">Your survey</span>
            <Typed>Mark where this character sits on each trait. The outlined box is the community average.</Typed>
          </div>
          {message && <FormNote error={failed}>{message}</FormNote>}
          <div className="grid gap-x-8 gap-y-3 md:grid-cols-2">
            {traits.map((trait) => {
              const myVal = myVoteMap.get(trait.id);
              const communityAvg = avgMap.get(trait.id) ?? 0;
              const avgBox = Math.max(-3, Math.min(3, Math.round(communityAvg)));
              return (
                <div key={trait.id} className="flex flex-col gap-1">
                  <div className="flex items-baseline justify-between gap-2 text-[14px]">
                    <span title={trait.description ?? undefined}>{trait.name}</span>
                    <span className="font-typed text-[12px] text-navy">
                      {myVal !== undefined ? `you ${signed(myVal)}, ` : ""}
                      community {signed(communityAvg)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-[72px] shrink-0 truncate font-typed text-[11px] text-steel-2" title={trait.lowLabel}>{trait.lowLabel}</span>
                    <div className="flex flex-1 justify-between">
                      {[-3, -2, -1, 0, 1, 2, 3].map((val) => {
                        const mine = myVal === val;
                        return (
                          <button
                            key={val}
                            type="button"
                            onClick={() => handleVote(trait.id, val)}
                            disabled={voting[trait.id]}
                            aria-pressed={mine}
                            aria-label={`${trait.name}: ${signed(val)}`}
                            title={`${signed(val)}`}
                            className={`h-5 w-5 border ${mine ? "border-blue bg-blue" : surveyed > 0 && val === avgBox ? "border-2 border-navy hover:bg-paper-2" : "border-steel hover:border-navy hover:bg-paper-2"}`}
                          />
                        );
                      })}
                    </div>
                    <span className="w-[72px] shrink-0 truncate text-right font-typed text-[11px] text-steel-2" title={trait.highLabel}>{trait.highLabel}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex flex-col gap-3 border-t border-steel pt-4">
            <span className="lab">Or file a pattern directly</span>
            <DisorderVotePanel profileSlug={profileSlug} />
          </div>
        </div>
      )}
    </Section>
  );
}
