"use client";
import { useCallback, useEffect, useState } from "react";

interface EvidenceItem {
  id: string;
  evidenceText: string;
  sourceUrl: string | null;
  sourceLabel: string | null;
  voteCount: number;
  user: { username: string };
}

export function EvidencePanel({ typingId }: { typingId: string }) {
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [text, setText] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceLabel, setSourceLabel] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchEvidence = useCallback(async () => {
    try {
      const res = await fetch(`/api/evidence?typingId=${typingId}`);
      if (res.ok) setEvidence(await res.json());
    } catch {} finally {
      setLoading(false);
    }
  }, [typingId]);

  useEffect(() => { fetchEvidence(); }, [fetchEvidence]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/evidence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileTypingId: typingId,
          evidenceText: text.trim(),
          sourceUrl: sourceUrl.trim() || undefined,
          sourceLabel: sourceLabel.trim() || undefined,
        }),
      });
      if (res.ok) {
        setText("");
        setSourceUrl("");
        setSourceLabel("");
        setShowForm(false);
        fetchEvidence();
      } else {
        const data = await res.json();
        alert(data.error || "Failed");
      }
    } catch {
      alert("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (evidenceId: string, voteValue: 1 | -1) => {
    try {
      await fetch(`/api/evidence/${evidenceId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voteValue }),
      });
      fetchEvidence();
    } catch {}
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-[#4a5a70]">Evidence ({evidence.length})</span>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-xs text-[#64ffda] hover:underline"
        >
          {showForm ? "Cancel" : "+ Add Evidence"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="p-3 rounded border border-[#1a2234] bg-[#141c2b] space-y-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Quote, scene, or behavior that supports this typing..."
            rows={2}
            className="w-full px-2 py-1 text-xs bg-[#0a0e17] border border-[#1a2234] rounded text-[#c8d0dc] placeholder-[#4a5a70] focus:outline-none focus:border-[#64ffda]/40 resize-none"
          />
          <div className="flex gap-2">
            <input
              value={sourceLabel}
              onChange={(e) => setSourceLabel(e.target.value)}
              placeholder="Source label (e.g., Episode 5)"
              className="flex-1 px-2 py-1 text-xs bg-[#0a0e17] border border-[#1a2234] rounded text-[#c8d0dc] placeholder-[#4a5a70] focus:outline-none focus:border-[#64ffda]/40"
            />
            <input
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="URL (optional)"
              className="flex-1 px-2 py-1 text-xs bg-[#0a0e17] border border-[#1a2234] rounded text-[#c8d0dc] placeholder-[#4a5a70] focus:outline-none focus:border-[#64ffda]/40"
            />
          </div>
          <button
            type="submit"
            disabled={submitting || !text.trim()}
            className="px-3 py-1 text-xs rounded bg-[#64ffda]/10 text-[#64ffda] border border-[#64ffda]/20 hover:bg-[#64ffda]/20 disabled:opacity-30"
          >
            {submitting ? "..." : "Submit Evidence"}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-xs text-[#4a5a70]">Loading...</p>
      ) : evidence.length === 0 ? (
        <p className="text-xs text-[#4a5a70] italic">No evidence yet.</p>
      ) : (
        <div className="space-y-1">
          {evidence.map((e) => (
            <div key={e.id} className="p-2 rounded border border-[#1a2234] bg-[#0e1420]/50">
              <p className="text-xs text-[#c8d0dc]">{e.evidenceText}</p>
              <div className="flex items-center gap-2 mt-1 text-[10px] text-[#4a5a70]">
                {e.sourceLabel && <span>{e.sourceLabel}</span>}
                {e.sourceUrl && (
                  <a href={e.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[#64ffda] hover:underline">
                    Source
                  </a>
                )}
                <span className="ml-auto">{e.user.username}</span>
                <button onClick={() => handleVote(e.id, 1)} className="hover:text-[#64ffda]">▲</button>
                <span>{e.voteCount}</span>
                <button onClick={() => handleVote(e.id, -1)} className="hover:text-[#ff6b6b]">▼</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}