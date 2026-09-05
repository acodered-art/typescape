"use client";
import { useEffect, useState } from "react";
import { Typed } from "@/components/dossier";
import { FormNote } from "@/components/dossier/modal";

interface Disorder {
  id: string;
  name: string;
  slug: string;
  cluster: string;
  description: string | null;
}

interface VoteBreakdown {
  disorderId: string;
  disorderName: string;
  disorderSlug: string;
  cluster: string;
  count: number;
  percentage: number;
}

interface VoteData {
  totalVotes: number;
  breakdown: VoteBreakdown[];
  myVote: { disorderId: string; disorderName: string; disorderSlug: string } | null;
}

interface Comorbidity {
  id: string;
  strength: number;
  description: string | null;
  disorderA: { id: string; name: string; slug: string; cluster: string };
  disorderB: { id: string; name: string; slug: string; cluster: string };
}

const CLUSTER_LABELS: Record<string, string> = {
  A: "Cluster A, odd or eccentric",
  B: "Cluster B, dramatic or emotional",
  C: "Cluster C, anxious or fearful",
  none: "Other patterns",
};

/** Readers file a pattern directly: one vote per reader per file, toggled off by voting the same pattern again. */
export function DisorderVotePanel({ profileSlug }: { profileSlug: string }) {
  const [disorders, setDisorders] = useState<Disorder[]>([]);
  const [voteData, setVoteData] = useState<VoteData | null>(null);
  const [comorbidities, setComorbidities] = useState<Comorbidity[]>([]);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [message, setMessage] = useState("");
  const [showGraph, setShowGraph] = useState(false);

  const fetchAll = async () => {
    try {
      const [disRes, voteRes, comRes] = await Promise.all([
        fetch("/api/disorders"),
        fetch(`/api/profiles/${profileSlug}/disorder-votes`),
        fetch("/api/disorders/comorbidities"),
      ]);
      if (disRes.ok) {
        const data = await disRes.json();
        setDisorders(data.disorders || []);
      }
      if (voteRes.ok) setVoteData(await voteRes.json());
      if (comRes.ok) setComorbidities(await comRes.json());
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [disRes, voteRes, comRes] = await Promise.all([
          fetch("/api/disorders"),
          fetch(`/api/profiles/${profileSlug}/disorder-votes`),
          fetch("/api/disorders/comorbidities"),
        ]);
        if (cancelled) return;
        if (disRes.ok) {
          const data = await disRes.json();
          setDisorders(data.disorders || []);
        }
        if (voteRes.ok) setVoteData(await voteRes.json());
        if (comRes.ok) setComorbidities(await comRes.json());
      } catch {} finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [profileSlug]);

  const handleVote = async (disorderId: string) => {
    setVoting(true);
    setMessage("");
    try {
      const res = await fetch(`/api/profiles/${profileSlug}/disorder-votes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disorderId }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessage(data.action === "removed" ? "Vote withdrawn." : "Vote filed.");
        fetchAll();
        setTimeout(() => setMessage(""), 2000);
      } else {
        const data = await res.json();
        setMessage(res.status === 401 ? "Sign in to file a pattern." : data.error || "Failed");
      }
    } catch {
      setMessage("Network error");
    } finally {
      setVoting(false);
    }
  };

  const grouped = disorders.reduce((acc, d) => {
    const key = d.cluster || "none";
    if (!acc[key]) acc[key] = [];
    acc[key].push(d);
    return acc;
  }, {} as Record<string, Disorder[]>);

  const breakdownMap = new Map<string, VoteBreakdown>();
  voteData?.breakdown.forEach((b) => breakdownMap.set(b.disorderId, b));

  if (loading) return <Typed>Opening the patterns.</Typed>;

  const failed = message === "Failed" || message === "Network error" || message.startsWith("Sign in");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <Typed className="text-[14px]">
          {voteData && voteData.totalVotes > 0 ? `${voteData.totalVotes} ${voteData.totalVotes === 1 ? "reader has" : "readers have"} filed a pattern directly.` : "No pattern filed directly yet. Mark the one that fits."}
        </Typed>
        {comorbidities.length > 0 && (
          <button type="button" onClick={() => setShowGraph(!showGraph)} className="font-typed text-[13px] text-blue underline hover:text-navy">
            {showGraph ? "Hide the co-morbidity table" : "Co-morbidity table"}
          </button>
        )}
      </div>

      {message && <FormNote error={failed}>{message}</FormNote>}

      {showGraph && comorbidities.length > 0 && (
        <div className="row-fill flex flex-col gap-1 px-3 py-3">
          <span className="lab">Patterns that travel together</span>
          {comorbidities.map((c) => (
            <div key={c.id} className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_44px] items-baseline gap-2 font-typed text-[13px]" title={c.description ?? undefined}>
              <span className="truncate">{c.disorderA.name}</span>
              <span className="text-steel-2">with</span>
              <span className="truncate">{c.disorderB.name}</span>
              <span className="text-right font-bold text-navy">{Math.round(c.strength * 100)}%</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-4">
        {Object.entries(grouped).map(([cluster, clusterDisorders]) => (
          <div key={cluster} className="flex flex-col gap-[6px]">
            <span className="lab">{CLUSTER_LABELS[cluster] || cluster}</span>
            {clusterDisorders.map((d) => {
              const breakdown = breakdownMap.get(d.id);
              const isMyVote = voteData?.myVote?.disorderId === d.id;
              const pct = breakdown?.percentage ?? 0;
              return (
                <div key={d.id} className="grid grid-cols-[18px_minmax(0,1fr)_44px] items-center gap-3 text-[14px] md:grid-cols-[18px_180px_minmax(0,1fr)_44px_60px]">
                  <button
                    type="button"
                    onClick={() => handleVote(d.id)}
                    disabled={voting}
                    aria-pressed={isMyVote}
                    className={`h-[14px] w-[14px] border ${isMyVote ? "border-blue bg-blue" : "border-navy hover:bg-paper-2"}`}
                    title={isMyVote ? `Withdraw your vote for ${d.name}` : `File ${d.name}`}
                  />
                  <span className={`truncate ${isMyVote ? "font-semibold" : ""}`} title={d.description ?? undefined}>{d.name}</span>
                  <div className="hidden h-2 bg-paper-2 md:block">{pct > 0 && <div className="h-2 bg-blue" style={{ width: `${pct}%` }} />}</div>
                  <span className={`text-right font-typed text-[13px] font-bold ${isMyVote ? "text-blue" : "text-navy"}`}>{breakdown ? `${pct}%` : ""}</span>
                  <span className="hidden text-right font-typed text-[12px] text-steel-2 md:block">{breakdown && breakdown.count > 0 ? `${breakdown.count} ${breakdown.count === 1 ? "vote" : "votes"}` : ""}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
