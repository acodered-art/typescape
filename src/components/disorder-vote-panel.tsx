"use client";
import { useEffect, useState } from "react";

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
  A: "Cluster A — Odd/Eccentric",
  B: "Cluster B — Dramatic/Emotional",
  C: "Cluster C — Anxious/Fearful",
  none: "Other",
};

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
        setMessage(data.action === "removed" ? "Vote removed" : "Vote saved");
        fetchAll();
        setTimeout(() => setMessage(""), 2000);
      } else {
        const data = await res.json();
        setMessage(data.error || "Failed");
      }
    } catch {
      setMessage("Network error");
    } finally {
      setVoting(false);
    }
  };

  // Group disorders by cluster
  const grouped = disorders.reduce((acc, d) => {
    const key = d.cluster || "none";
    if (!acc[key]) acc[key] = [];
    acc[key].push(d);
    return acc;
  }, {} as Record<string, Disorder[]>);

  // Build a lookup for breakdown percentages
  const breakdownMap = new Map<string, VoteBreakdown>();
  voteData?.breakdown.forEach((b) => breakdownMap.set(b.disorderId, b));

  if (loading) {
    return (
      <section className="p-4 rounded-lg border border-[#1a2234] bg-[#0e1420]">
        <h2 className="text-sm font-semibold text-[#7888a0] uppercase tracking-wider mb-3">
          Cluster Disorder Voting
        </h2>
        <p className="text-xs text-[#4a5a70]">Loading disorders...</p>
      </section>
    );
  }

  return (
    <section className="p-4 rounded-lg border border-[#1a2234] bg-[#0e1420]">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-[#7888a0] uppercase tracking-wider">
          Cluster Disorder Voting
        </h2>
        <div className="flex items-center gap-2">
          {voteData && (
            <span className="text-xs text-[#4a5a70]">{voteData.totalVotes} vote{voteData.totalVotes !== 1 ? "s" : ""}</span>
          )}
          {comorbidities.length > 0 && (
            <button
              onClick={() => setShowGraph(!showGraph)}
              className="text-xs text-[#64ffda] hover:underline"
            >
              {showGraph ? "Hide graph" : "Co-morbidity"}
            </button>
          )}
        </div>
      </div>

      {message && (
        <div className="mb-3 text-xs px-2 py-1 rounded bg-[#64ffda]/10 text-[#64ffda] border border-[#64ffda]/20">
          {message}
        </div>
      )}

      {/* Co-morbidity Graph */}
      {showGraph && comorbidities.length > 0 && (
        <div className="mb-4 p-3 rounded border border-[#1a2234] bg-[#141c2b]">
          <h3 className="text-xs font-semibold text-[#7888a0] uppercase tracking-wider mb-2">
            Co-morbidity Network
          </h3>
          <div className="space-y-1.5">
            {comorbidities.map((c) => (
              <div key={c.id} className="flex items-center gap-2 text-xs">
                <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                  c.disorderA.cluster === "A" ? "bg-[#2a3f6e] text-[#8ab4f8]" :
                  c.disorderA.cluster === "B" ? "bg-[#6b2a2a] text-[#ff6b6b]" :
                  c.disorderA.cluster === "C" ? "bg-[#2a4a3e] text-[#7ddfc0]" :
                  "bg-[#1a2234] text-[#4a5a70]"
                }`}>
                  {c.disorderA.name.split(" ")[0]}
                </span>
                <span className="text-[#4a5a70]">↔</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                  c.disorderB.cluster === "A" ? "bg-[#2a3f6e] text-[#8ab4f8]" :
                  c.disorderB.cluster === "B" ? "bg-[#6b2a2a] text-[#ff6b6b]" :
                  c.disorderB.cluster === "C" ? "bg-[#2a4a3e] text-[#7ddfc0]" :
                  "bg-[#1a2234] text-[#4a5a70]"
                }`}>
                  {c.disorderB.name.split(" ")[0]}
                </span>
                <span className="text-[#4a5a70] ml-auto">{Math.round(c.strength * 100)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Disorders by Cluster */}
      <div className="space-y-4">
        {Object.entries(grouped).map(([cluster, clusterDisorders]) => (
          <div key={cluster}>
            <h3 className="text-xs font-semibold text-[#4a5a70] uppercase tracking-wider mb-2">
              {CLUSTER_LABELS[cluster] || cluster}
            </h3>
            <div className="space-y-1">
              {clusterDisorders.map((d) => {
                const breakdown = breakdownMap.get(d.id);
                const isMyVote = voteData?.myVote?.disorderId === d.id;
                const barColor = cluster === "A" ? "bg-[#8ab4f8]" : cluster === "B" ? "bg-[#ff6b6b]" : cluster === "C" ? "bg-[#7ddfc0]" : "bg-[#4a5a70]";

                return (
                  <div
                    key={d.id}
                    className={`flex items-center gap-2 px-3 py-2 rounded border text-sm transition-colors ${
                      isMyVote
                        ? "border-[#64ffda]/40 bg-[#64ffda]/10"
                        : "border-[#1a2234] bg-[#141c2b] hover:border-[#2a3a4a]"
                    }`}
                  >
                    {/* Vote button */}
                    <button
                      onClick={() => handleVote(d.id)}
                      disabled={voting}
                      className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                        isMyVote
                          ? "border-[#64ffda] bg-[#64ffda]/20"
                          : "border-[#2a3a4a] hover:border-[#64ffda]/40"
                      }`}
                      title={isMyVote ? `Remove vote for ${d.name}` : `Vote ${d.name}`}
                    >
                      {isMyVote && <span className="w-2 h-2 rounded-full bg-[#64ffda]" />}
                    </button>

                    {/* Name */}
                    <span className="text-xs text-[#c8d0dc] min-w-[8rem]">{d.name}</span>

                    {/* Percentage bar */}
                    <div className="flex-1 h-3 bg-[#0a0e17] rounded-full overflow-hidden relative">
                      {breakdown && breakdown.percentage > 0 && (
                        <div
                          className={`h-full ${barColor} rounded-full transition-all`}
                          style={{ width: `${breakdown.percentage}%` }}
                        />
                      )}
                    </div>

                    {/* Percentage label */}
                    <span className="text-xs text-[#7888a0] w-10 text-right shrink-0">
                      {breakdown ? `${breakdown.percentage}%` : "—"}
                    </span>

                    {/* Vote count */}
                    <span className="text-[10px] text-[#4a5a70] w-6 text-right shrink-0">
                      {breakdown ? breakdown.count : 0}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {voteData && voteData.totalVotes === 0 && (
        <p className="text-xs text-[#4a5a70] italic mt-3 text-center">
          No votes yet. Click the circle next to a disorder to cast your vote.
        </p>
      )}
    </section>
  );
}