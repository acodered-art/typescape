"use client";
import { useCallback, useEffect, useState } from "react";
import { calcConsensus } from "@/lib/utils";
import Link from "next/link";
import { getCorrelations } from "@/lib/correlations";
import { EvidencePanel } from "./evidence-panel";

function CorrelationLinks({ systemSlug, typeValue }: { systemSlug: string; typeValue: string }) {
  const correlations = getCorrelations(systemSlug, typeValue);
  if (correlations.length === 0) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {correlations.slice(0, 3).map((c) => (
        <Link
          key={`${c.targetSystem}-${c.targetType}`}
          href={`/search?type=${c.targetType}&system=${c.targetSystem}`}
          className="text-[10px] px-1.5 py-0.5 rounded bg-[#1a2234] text-[#4a5a70] hover:text-[#64ffda] transition-colors"
          title={c.description}
        >
          → {c.targetType} ({Math.round(c.strength * 100)}%)
        </Link>
      ))}
    </div>
  );
}

interface TypingVoteData {
  id: string;
  typeValue: string;
  confidence: number;
  voteCount: number;
  upvotes: number;
  downvotes: number;
  typingSystem: { name: string; slug: string };
  votes: { voteValue: number; weight: number }[];
  myVote: number | null;
}

interface VotePanelProps {
  profileSlug: string;
}

export function VotePanel({ profileSlug }: VotePanelProps) {
  const [typings, setTypings] = useState<TypingVoteData[]>([]);
  const [loading, setLoading] = useState(true);
  const [votingStates, setVotingStates] = useState<Record<string, "up" | "down" | null>>({});

  const fetchTypings = useCallback(async () => {
    try {
      const res = await fetch(`/api/profiles/${profileSlug}`);
      if (!res.ok) return;
      const data = await res.json();
      setTypings(
        data.typings.map((t: TypingVoteData & { votes: { voteValue: number; weight: number }[] }) => {
          const consensus = calcConsensus(t.votes, 0);
          const upvotes = t.votes.filter((v) => v.voteValue > 0).length;
          const downvotes = t.votes.filter((v) => v.voteValue < 0).length;
          return {
            ...t,
            confidence: consensus.percentage,
            voteCount: consensus.voteCount,
            upvotes,
            downvotes,
          };
        })
      );
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }, [profileSlug]);

  useEffect(() => {
    fetchTypings();
  }, [fetchTypings]);

  const handleVote = async (typingId: string, voteValue: 1 | -1) => {
    // Optimistic update
    setVotingStates((prev) => ({ ...prev, [typingId]: prev[typingId] === (voteValue === 1 ? "up" : "down") ? null : voteValue === 1 ? "up" : "down" }));

    try {
      const res = await fetch(`/api/typings/${typingId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voteValue }),
      });
      if (!res.ok) {
        // Revert on error
        setVotingStates((prev) => ({ ...prev, [typingId]: null }));
      }
      // Refetch to get accurate consensus
      fetchTypings();
    } catch {
      setVotingStates((prev) => ({ ...prev, [typingId]: null }));
    }
  };

  if (loading) {
    return <div className="text-sm text-[#4a5a70]">Loading typings...</div>;
  }

  if (typings.length === 0) {
    return <p className="text-sm text-[#4a5a70] italic">No typings yet.</p>;
  }

  // Group by system
  const bySystem = new Map<string, TypingVoteData[]>();
  for (const t of typings) {
    const key = t.typingSystem.slug;
    if (!bySystem.has(key)) bySystem.set(key, []);
    bySystem.get(key)!.push(t);
  }

  return (
    <div className="space-y-4">
      {Array.from(bySystem.entries()).map(([systemSlug, entries]) => (
        <div key={systemSlug} className="p-4 rounded-lg border border-[#1a2234] bg-[#0e1420]">
          <h3 className="text-sm font-semibold text-[#c8d0dc] uppercase mb-3">
            {entries[0].typingSystem.name}
          </h3>
          <div className="flex flex-wrap gap-3">
            {entries.map((t) => {
              const myVote = votingStates[t.id];
              return (
                <div
                  key={t.id}
                  className="p-3 rounded border border-[#1a2234] bg-[#141c2b]"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-[#e8ecf4]">{t.typeValue}</span>
                    <span className="text-xs text-[#64ffda]">{t.confidence}%</span>
                    <span className="text-xs text-[#4a5a70]">({t.votes.length} votes)</span>
                    {t.downvotes > 0 && t.upvotes > 0 && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-[#ff6b6b]/10 text-[#ff6b6b] border border-[#ff6b6b]/20" title="Split vote — controversial typing">
                        !!
                      </span>
                    )}
                    <div className="flex gap-0.5 ml-auto">
                      <button
                        onClick={() => handleVote(t.id, 1)}
                        className={`px-1.5 py-0.5 text-xs rounded transition-colors ${
                          myVote === "up"
                            ? "bg-[#64ffda]/20 text-[#64ffda] border border-[#64ffda]/40"
                            : "bg-[#1a2234] text-[#4a5a70] hover:text-[#64ffda] border border-transparent"
                        }`}
                        title="Agree with this typing"
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => handleVote(t.id, -1)}
                        className={`px-1.5 py-0.5 text-xs rounded transition-colors ${
                          myVote === "down"
                            ? "bg-[#ff6b6b]/20 text-[#ff6b6b] border border-[#ff6b6b]/40"
                            : "bg-[#1a2234] text-[#4a5a70] hover:text-[#ff6b6b] border border-transparent"
                        }`}
                        title="Disagree with this typing"
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                  <CorrelationLinks systemSlug={entries[0].typingSystem.slug} typeValue={t.typeValue} />
                  <EvidencePanel typingId={t.id} />
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}