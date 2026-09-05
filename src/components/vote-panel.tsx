"use client";
import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { calcConsensus } from "@/lib/utils";
import { getCorrelations } from "@/lib/correlations";
import { Btn, EmptySlot, InkTag, SectionHead, SegBar, Typed, bySystemOrder } from "@/components/dossier";

export type TypingRead = {
  id: string;
  typeValue: string;
  typingSystem: { name: string; slug: string };
  votes: { voteValue: number; weight: number }[];
  creator?: { username: string } | null;
};

/** Five readers certify a finding; under that it stays a dashed row. */
const CERTIFIED_AT = 5;
/** Every vote panel on the page refetches when any of them files a vote. */
const VOTES_EVENT = "typescape:votes";

const count = (k: number, one: string, many = `${one}s`) => `${k} ${k === 1 ? one : many}`;
const upvotes = (t: TypingRead) => t.votes.filter((v) => v.voteValue > 0).length;

/** One system's reads ranked by agreement, each with its share of the system's agreeing votes. */
function rankSystem(list: TypingRead[]) {
  const total = list.reduce((s, t) => s + upvotes(t), 0);
  const readers = list.reduce((s, t) => s + t.votes.length, 0);
  const ranked = [...list]
    .sort((a, b) => upvotes(b) - upvotes(a))
    .map((t) => ({ t, reads: upvotes(t), pct: total > 0 ? Math.round((upvotes(t) / total) * 100) : 0 }));
  const lead = ranked[0];
  const runner = ranked.length > 1 && ranked[1].reads > 0 ? ranked[1] : null;
  const disputed = readers >= CERTIFIED_AT && (lead.pct < 60 || (runner !== null && lead.pct - runner.pct < 15));
  return { total, readers, ranked, lead, runner, disputed };
}

function groupBySystem(typings: TypingRead[]): Map<string, TypingRead[]> {
  const map = new Map<string, TypingRead[]>();
  for (const t of bySystemOrder(typings)) {
    const list = map.get(t.typingSystem.slug) ?? [];
    list.push(t);
    map.set(t.typingSystem.slug, list);
  }
  return map;
}

function CrossReads({ systemSlug, typeValue }: { systemSlug: string; typeValue: string }) {
  const correlations = getCorrelations(systemSlug, typeValue);
  if (correlations.length === 0) return null;
  return (
    <Typed className="text-[12px] text-steel-2">
      Often read as{" "}
      {correlations.slice(0, 3).map((c, i) => (
        <span key={`${c.targetSystem}-${c.targetType}`}>
          {i > 0 && ", "}
          <Link href={`/search?type=${c.targetType}&system=${c.targetSystem}`} className="underline" title={c.description}>
            {c.targetType}
          </Link>{" "}
          ({Math.round(c.strength * 100)}%)
        </span>
      ))}
      .
    </Typed>
  );
}

/**
 * The findings on a file. `summary` = one row per system (the subject sheet): leading read, agreement bar, readers,
 * DISPUTED tag, agree/disagree. `full` = every read grouped by system (the Findings tab). Voting keeps the
 * existing toggle semantics (same value again removes the vote); the reader's own vote renders filled blue.
 */
/** `initialMine` is the reader's own vote per read, read server-side; the profile API does not say which vote is yours. */
export function VotePanel({ profileSlug, initial, initialMine, mode = "summary" }: { profileSlug: string; initial?: TypingRead[]; initialMine?: Record<string, 1 | -1>; mode?: "summary" | "full" }) {
  const [typings, setTypings] = useState<TypingRead[]>(initial ?? []);
  const [loading, setLoading] = useState(!initial);
  const [myVotes, setMyVotes] = useState<Record<string, 1 | -1 | null>>(initialMine ?? {});
  const [note, setNote] = useState("");

  const fetchTypings = useCallback(async () => {
    try {
      const res = await fetch(`/api/profiles/${profileSlug}`);
      if (!res.ok) return;
      const data = await res.json();
      setTypings(data.typings as TypingRead[]);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [profileSlug]);

  useEffect(() => {
    let cancelled = false;
    if (!initial) {
      (async () => {
        try {
          const res = await fetch(`/api/profiles/${profileSlug}`);
          if (!res.ok || cancelled) return;
          const data = await res.json();
          if (!cancelled) setTypings(data.typings as TypingRead[]);
        } catch {
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
    }
    const refetch = () => {
      fetchTypings();
    };
    window.addEventListener(VOTES_EVENT, refetch);
    return () => {
      cancelled = true;
      window.removeEventListener(VOTES_EVENT, refetch);
    };
  }, [fetchTypings, initial, profileSlug]);

  const handleVote = async (typingId: string, voteValue: 1 | -1) => {
    // Optimistic toggle; the refetch after the request settles the real counts.
    setMyVotes((prev) => ({ ...prev, [typingId]: prev[typingId] === voteValue ? null : voteValue }));
    setNote("");
    try {
      const res = await fetch(`/api/typings/${typingId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voteValue }),
      });
      if (!res.ok) {
        setMyVotes((prev) => ({ ...prev, [typingId]: null }));
        setNote(res.status === 401 ? "Sign in to vote on a finding." : "That vote did not go through.");
      }
      window.dispatchEvent(new Event(VOTES_EVENT));
    } catch {
      setMyVotes((prev) => ({ ...prev, [typingId]: null }));
      setNote("That vote did not go through.");
    }
  };

  const voteButtons = (t: TypingRead, secondOnly = false) => {
    const mine = myVotes[t.id] ?? null;
    return (
      <div className="flex items-center gap-2">
        <Btn variant="small" onClick={() => handleVote(t.id, 1)} className={mine === 1 ? "bg-blue text-ink" : ""} title={mine === 1 ? "Withdraw your agreement" : "Agree with this read"}>
          {secondOnly ? "Second it" : "Agree"}
        </Btn>
        {!secondOnly && (
          <Btn variant="small" onClick={() => handleVote(t.id, -1)} className={mine === -1 ? "bg-navy text-paper" : "border-navy text-navy"} title={mine === -1 ? "Withdraw your disagreement" : "Disagree with this read"}>
            Disagree
          </Btn>
        )}
      </div>
    );
  };

  if (loading) return <Typed>Opening the findings.</Typed>;

  if (typings.length === 0) {
    return <EmptySlot label="No findings">Nobody has read this character yet. The first read opens the file for votes.</EmptySlot>;
  }

  const systems = groupBySystem(typings);

  if (mode === "full") {
    return (
      <div className="flex flex-col gap-5">
        {note && <Typed className="text-[14px]">{note}</Typed>}
        {[...systems.entries()].map(([slug, list]) => {
          const r = rankSystem(list);
          return (
            <div key={slug} className="flex flex-col gap-2">
              <SectionHead size={20} title={list[0].typingSystem.name} aside={r.readers > 0 ? count(r.readers, "reader") : "no reads yet"} />
              {r.ranked.map(({ t, pct }) => {
                const agreement = t.votes.length > 0 ? calcConsensus(t.votes, 0).percentage : null;
                return (
                  <div key={t.id} className="row-fill flex flex-col gap-2 px-3 py-[10px] md:grid md:grid-cols-[90px_minmax(0,1fr)_170px_auto] md:items-center md:gap-3">
                    <div className="font-typed text-[24px] font-bold">{t.typeValue}</div>
                    <div className="flex flex-col gap-1">
                      <SegBar lead={pct} height={10} />
                      <CrossReads systemSlug={slug} typeValue={t.typeValue} />
                    </div>
                    <Typed className="text-[13px]">
                      {t.votes.length === 0 ? "No votes yet" : `${agreement}% agree, ${count(t.votes.length, "reader")}`}
                      {t.creator?.username && <span className="block text-[12px] text-steel-2">Filed by {t.creator.username}</span>}
                    </Typed>
                    {voteButtons(t)}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {note && <Typed className="text-[14px]">{note}</Typed>}
      {[...systems.entries()].map(([slug, list]) => {
        const r = rankSystem(list);
        const name = list[0].typingSystem.name;
        if (r.readers < CERTIFIED_AT) {
          const need = CERTIFIED_AT - r.readers;
          return (
            <div key={slug} className="dashed flex flex-col gap-2 px-3 py-[10px] md:grid md:grid-cols-[150px_90px_minmax(0,1fr)_auto] md:items-center md:gap-3">
              <div className="font-display text-[16px] font-bold uppercase tracking-[0.1em] text-navy md:text-[19px]">{name}</div>
              <div className="font-typed text-[24px] font-bold text-navy md:text-[26px]">{r.lead.t.typeValue}</div>
              <Typed className="text-[14px]">
                {r.readers === 0 ? `No reads yet. Needs ${CERTIFIED_AT} before this finding is certified.` : `${count(r.readers, "reader")}. Needs ${count(need, "more reader", "more")} before this finding is certified.`}
              </Typed>
              {voteButtons(r.lead.t, true)}
            </div>
          );
        }
        return (
          <div key={slug} className="row-fill flex flex-col gap-2 px-[10px] py-[10px] md:grid md:grid-cols-[150px_90px_minmax(0,1fr)_150px_90px_auto] md:items-center md:gap-3 md:px-3">
            <div className="flex items-baseline justify-between md:contents">
              <div className="font-display text-[16px] font-bold uppercase tracking-[0.1em] md:text-[19px]">{name}</div>
              <Typed className="text-[12px] md:hidden">{count(r.readers, "reader")}</Typed>
            </div>
            <div className="flex items-center gap-[10px] md:contents">
              <div className="w-[58px] font-typed text-[24px] font-bold md:w-auto md:text-[26px]">{r.lead.t.typeValue}</div>
              <SegBar className="flex-1" lead={r.lead.pct} runner={r.runner?.pct ?? 0} height={10} />
              <div className="font-typed text-[14px] text-navy">
                <span className="font-bold text-blue">{r.lead.pct}%</span>
                {r.runner && <span className="ml-3 hidden text-steel-2 md:inline">{r.runner.t.typeValue} {r.runner.pct}%</span>}
              </div>
            </div>
            <Typed className="hidden md:block">{count(r.readers, "reader")}</Typed>
            <div className="flex flex-wrap items-center justify-between gap-2 md:contents">
              {r.runner ? <Typed className="text-[12px] md:hidden">also {r.runner.t.typeValue} {r.runner.pct}%</Typed> : <span className="md:hidden" />}
              <div className="flex items-center gap-2 md:justify-end">
                {r.disputed && <InkTag>Disputed</InkTag>}
                {voteButtons(r.lead.t)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** The findings rail beside the discussion: one block per system with the key share, the runner-up, readers, DISPUTED. */
export function FindingsRail({ typings, children }: { typings: TypingRead[]; children?: ReactNode }) {
  const systems = groupBySystem(typings);
  return (
    <aside className="flex flex-col gap-3">
      <SectionHead size={20} title="On the table" />
      {[...systems.entries()].map(([slug, list]) => {
        const r = rankSystem(list);
        const name = list[0].typingSystem.name;
        const certified = r.readers >= CERTIFIED_AT;
        return (
          <div key={slug} className={`flex flex-col gap-[5px] px-[10px] py-[9px] ${certified ? "row-fill" : "dashed"}`}>
            <div className="flex items-baseline justify-between gap-2">
              <span className={`font-display text-[15px] font-bold uppercase tracking-[0.08em] ${certified ? "" : "text-navy"}`}>{name}</span>
              {r.disputed && <InkTag>Disputed</InkTag>}
            </div>
            <Typed className="leading-[1.45]">
              {certified ? (
                <>
                  <span className="font-bold text-blue">{r.lead.t.typeValue} {r.lead.pct}%</span>
                  {r.runner && ` ${r.runner.t.typeValue} ${r.runner.pct}%`}. {count(r.readers, "reader")}.
                </>
              ) : (
                `${r.lead.t.typeValue}, ${r.readers === 0 ? "no reads yet" : count(r.readers, "reader")}. Needs ${CERTIFIED_AT - r.readers} more.`
              )}
            </Typed>
          </div>
        );
      })}
      {children}
    </aside>
  );
}
