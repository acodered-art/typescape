"use client";
import { useEffect, useState } from "react";

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

const CLUSTER_BAR_COLORS: Record<string, string> = {
  A: "bg-[#8ab4f8]",
  B: "bg-[#ff6b6b]",
  C: "bg-[#7ddfc0]",
  none: "bg-[#4a5a70]",
};

const CLUSTER_TEXT_COLORS: Record<string, string> = {
  A: "text-[#8ab4f8]",
  B: "text-[#ff6b6b]",
  C: "text-[#7ddfc0]",
  none: "text-[#4a5a70]",
};

const CLUSTER_BG: Record<string, string> = {
  A: "bg-[#2a3f6e]/20",
  B: "bg-[#6b2a2a]/20",
  C: "bg-[#2a4a3e]/20",
  none: "bg-[#1a2234]/20",
};

export function TraitVotePanel({ profileSlug }: { profileSlug: string }) {
  const [traits, setTraits] = useState<Trait[]>([]);
  const [voteData, setVoteData] = useState<VoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState("");

  const fetchData = async () => {
    try {
      const [tRes, vRes] = await Promise.all([
        fetch("/api/traits"),
        fetch(`/api/profiles/${profileSlug}/trait-votes`),
      ]);
      if (tRes.ok) setTraits(await tRes.json());
      if (vRes.ok) setVoteData(await vRes.json());
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [tRes, vRes] = await Promise.all([
        fetch("/api/traits"),
        fetch(`/api/profiles/${profileSlug}/trait-votes`),
      ]);
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
        setMessage(data.action === "removed" ? "Vote removed" : "Vote saved");
        fetchData();
        setTimeout(() => setMessage(""), 2000);
      } else {
        const data = await res.json();
        setMessage(data.error || "Failed");
      }
    } catch {
      setMessage("Network error");
    } finally {
      setVoting((prev) => ({ ...prev, [traitId]: false }));
    }
  };

  // Build my vote lookup
  const myVoteMap = new Map<string, number>();
  voteData?.myVotes.forEach((v) => myVoteMap.set(v.traitId, v.value));

  // Build community avg lookup
  const avgMap = new Map<string, number>();
  voteData?.traits.forEach((t) => avgMap.set(t.traitId, t.avg));

  if (loading) {
    return (
      <section className="p-4 rounded-lg border border-[#1a2234] bg-[#0e1420]">
        <h2 className="text-sm font-semibold text-[#7888a0] uppercase tracking-wider mb-3">
          Trait Vector Analysis
        </h2>
        <p className="text-xs text-[#4a5a70]">Loading trait dimensions...</p>
      </section>
    );
  }

  return (
    <section className="p-4 rounded-lg border border-[#1a2234] bg-[#0e1420]">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-[#7888a0] uppercase tracking-wider">
          Trait Vector Analysis
        </h2>
        {voteData && (
          <span className="text-xs text-[#4a5a70]">
            {voteData.totalVoters} voter{voteData.totalVoters !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {message && (
        <div className="mb-3 text-xs px-2 py-1 rounded bg-[#64ffda]/10 text-[#64ffda] border border-[#64ffda]/20">
          {message}
        </div>
      )}

      {/* Description */}
      {voteData && voteData.description && (
        <div className="mb-4 p-3 rounded border border-[#1a2234] bg-[#141c2b]">
          <p className="text-sm text-[#c8d0dc] italic">{voteData.description}</p>
        </div>
      )}

      {/* Trait Sliders */}
      <div className="space-y-4">
        {traits.map((trait) => {
          const myVal = myVoteMap.get(trait.id);
          const communityAvg = avgMap.get(trait.id) ?? 0;

          return (
            <div key={trait.id}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-[#c8d0dc] font-medium">{trait.name}</span>
                <div className="flex items-center gap-2 text-[10px]">
                  {myVal !== undefined && (
                    <span className="text-[#64ffda]">You: {myVal > 0 ? "+" : ""}{myVal}</span>
                  )}
                  <span className="text-[#4a5a70]">
                    Community: {communityAvg > 0 ? "+" : ""}{communityAvg.toFixed(1)}
                  </span>
                </div>
              </div>

              {/* Labels */}
              <div className="flex justify-between text-[10px] text-[#4a5a70] mb-0.5">
                <span>{trait.lowLabel}</span>
                <span>{trait.highLabel}</span>
              </div>

              {/* Slider track */}
              <div className="relative h-8 flex items-center">
                {/* Background track */}
                <div className="absolute inset-x-0 h-1.5 bg-[#1a2234] rounded-full" />

                {/* Community average marker */}
                <div
                  className="absolute w-0.5 h-5 bg-[#7888a0] rounded-full transition-all"
                  style={{ left: `${((communityAvg + 3) / 6) * 100}%`, transform: "translateX(-50%)" }}
                  title={`Community avg: ${communityAvg.toFixed(1)}`}
                />

                {/* Clickable positions */}
                {[-3, -2, -1, 0, 1, 2, 3].map((val) => {
                  const isActive = myVal === val;
                  return (
                    <button
                      key={val}
                      onClick={() => handleVote(trait.id, val)}
                      disabled={voting[trait.id]}
                      className={`absolute w-5 h-5 rounded-full border-2 transition-all flex items-center justify-center ${
                        isActive
                          ? "border-[#64ffda] bg-[#64ffda]/20 scale-110 z-10"
                          : "border-[#2a3a4a] hover:border-[#64ffda]/40 hover:scale-110 z-10"
                      }`}
                      style={{ left: `${((val + 3) / 6) * 100}%`, transform: "translateX(-50%)" }}
                      title={`${trait.lowLabel} ← ${val} → ${trait.highLabel}`}
                    >
                      {isActive && <span className="w-2 h-2 rounded-full bg-[#64ffda]" />}
                    </button>
                  );
                })}
              </div>

              {/* Value labels */}
              <div className="flex justify-between text-[10px] text-[#4a5a70] mt-0.5">
                <span>-3</span>
                <span>-2</span>
                <span>-1</span>
                <span>0</span>
                <span>+1</span>
                <span>+2</span>
                <span>+3</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Results Breakdown */}
      {voteData && voteData.breakdown.length > 0 && (
        <div className="mt-6 pt-4 border-t border-[#1a2234]">
          <h3 className="text-xs font-semibold text-[#7888a0] uppercase tracking-wider mb-3">
            Disorder Match
          </h3>
          <div className="space-y-1.5">
            {voteData.breakdown.map((b) => {
              const barColor = CLUSTER_BAR_COLORS[b.cluster] || "bg-[#4a5a70]";
              const textColor = CLUSTER_TEXT_COLORS[b.cluster] || "text-[#4a5a70]";
              const bgColor = CLUSTER_BG[b.cluster] || "bg-[#1a2234]/20";

              return (
                <div
                  key={b.disorderId}
                  className={`flex items-center gap-2 px-3 py-2 rounded border text-sm ${
                    b.percentage > 20 ? "border-[#2a3a4a] bg-[#141c2b]" : "border-[#1a2234] bg-[#0e1420]/50"
                  }`}
                >
                  {/* Cluster badge */}
                  <span className={`shrink-0 w-5 h-5 rounded text-[10px] flex items-center justify-center font-bold ${bgColor} ${textColor}`}>
                    {b.cluster === "none" ? "—" : b.cluster}
                  </span>

                  {/* Name */}
                  <span className="text-xs text-[#c8d0dc] min-w-[8rem]">{b.disorderName}</span>

                  {/* Bar */}
                  <div className="flex-1 h-3 bg-[#0a0e17] rounded-full overflow-hidden">
                    <div
                      className={`h-full ${barColor} rounded-full transition-all`}
                      style={{ width: `${b.percentage}%` }}
                    />
                  </div>

                  {/* Percentage */}
                  <span className="text-xs text-[#7888a0] w-10 text-right shrink-0">
                    {b.percentage}%
                  </span>

                  {/* Similarity */}
                  <span className="text-[10px] text-[#4a5a70] w-12 text-right shrink-0">
                    {b.similarity.toFixed(2)} sim
                  </span>
                </div>
              );
            })}
          </div>

          {/* Auto-detect None */}
          {voteData.autoNone && (
            <div className="mt-2 p-2 rounded border border-[#4a5a70]/30 bg-[#1a2234]/20 text-xs text-[#7888a0] text-center">
              No disorder exceeds 15% similarity &mdash; traits don&apos;t strongly align with any cluster
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {voteData && voteData.totalVoters === 0 && (
        <p className="text-xs text-[#4a5a70] italic mt-4 text-center">
          No trait votes yet. Click the dots on each slider to rate this character.
        </p>
      )}
    </section>
  );
}