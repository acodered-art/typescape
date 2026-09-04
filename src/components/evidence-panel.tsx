"use client";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Btn, CodeChip, PaperClip, SectionHead, Typed } from "@/components/dossier";
import { FormNote } from "@/components/dossier/modal";
import { useReaderHandle } from "@/components/dossier/reader";

interface EvidenceItem {
  id: string;
  evidenceText: string;
  sourceUrl: string | null;
  sourceLabel: string | null;
  voteCount: number;
  user: { username: string };
}

const letter = (i: number) => String.fromCharCode(65 + (i % 26));
const ROTATIONS = [-0.6, 0.5, -0.4];

function sourceOf(e: EvidenceItem): ReactNode {
  let label = e.sourceLabel;
  if (!label && e.sourceUrl) {
    try {
      label = new URL(e.sourceUrl).hostname.replace(/^www\./, "");
    } catch {
      label = e.sourceUrl;
    }
  }
  if (!label) return null;
  if (e.sourceUrl) {
    return (
      <a href={e.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">
        {label}
      </a>
    );
  }
  return label;
}

/**
 * The exhibits filed on one read: paper slips held by a clip (letter, source, the quote on ruled lines,
 * "Supports <read>", who filed it, CONVINCING with the count), two alternating columns on wide screens,
 * then the dashed slot for the next exhibit, which opens the form. Votes keep the API's plain increment
 * semantics; the button the reader pressed renders filled, and a reader cannot vote on their own exhibit.
 */
export function EvidencePanel({ typingId, code, systemName, subject, certified = true }: { typingId: string; code?: string; systemName?: string; subject?: string; certified?: boolean }) {
  const me = useReaderHandle();
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [text, setText] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceLabel, setSourceLabel] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [note, setNote] = useState("");
  const [myVotes, setMyVotes] = useState<Record<string, 1 | -1>>({});

  const fetchEvidence = useCallback(async () => {
    try {
      const res = await fetch(`/api/evidence?typingId=${typingId}`);
      if (res.ok) setEvidence(await res.json());
    } catch {} finally {
      setLoading(false);
    }
  }, [typingId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/evidence?typingId=${typingId}`);
        if (cancelled) return;
        if (res.ok) setEvidence(await res.json());
      } catch {} finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [typingId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSubmitting(true);
    setNote("");
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
        setNote(res.status === 401 ? "Sign in to file an exhibit." : data.error || "Failed");
      }
    } catch {
      setNote("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (evidenceId: string, voteValue: 1 | -1) => {
    try {
      const res = await fetch(`/api/evidence/${evidenceId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voteValue }),
      });
      if (res.ok) setMyVotes((prev) => ({ ...prev, [evidenceId]: voteValue }));
      else if (res.status === 401) setNote("Sign in to weigh an exhibit.");
      fetchEvidence();
    } catch {}
  };

  const slip = (e: EvidenceItem, i: number) => {
    const mine = myVotes[e.id];
    const own = me !== "" && e.user.username === me;
    return (
      <article key={e.id} className="relative flex flex-col gap-3 border border-steel bg-paper px-[18px] pb-[14px] pt-5 shadow-[0_8px_18px_rgba(0,0,0,0.16)]" style={{ transform: `rotate(${ROTATIONS[i % ROTATIONS.length]}deg)` }}>
        <PaperClip className="left-[18px] top-[-14px]" />
        <div className="flex items-baseline justify-between gap-3 pl-[30px]">
          <span className="lab">Exhibit {letter(i)}</span>
          <Typed>{sourceOf(e)}</Typed>
        </div>
        <div className="ruled whitespace-pre-wrap text-[15px]">{e.evidenceText}</div>
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-ink pt-[10px]">
          {code && (
            <div className="flex items-center gap-2 font-typed text-[13px] text-navy">
              Supports <CodeChip tone={certified ? "blue" : "navy"}>{code}</CodeChip> {systemName}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-typed text-[12px] text-steel-2">Filed by {e.user.username}</span>
            <Btn variant="small" onClick={() => handleVote(e.id, 1)} disabled={own} className={mine === 1 ? "bg-blue text-ink" : ""} title={own ? "Your own exhibit" : "This exhibit convinces me"}>
              Convincing ({e.voteCount})
            </Btn>
            <Btn variant="small" onClick={() => handleVote(e.id, -1)} disabled={own} className={mine === -1 ? "bg-navy text-paper" : "border-navy text-navy"} title={own ? "Your own exhibit" : "This exhibit does not convince me"}>
              Weak
            </Btn>
          </div>
        </div>
      </article>
    );
  };

  const next = letter(evidence.length);
  const who = subject ?? "this character";
  const slot = (
    <div className="dashed flex min-h-[120px] flex-col justify-center gap-[10px] px-[18px] py-5">
      <span className="lab text-steel-2">Exhibit {next}</span>
      {showForm ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="lab text-[13px]">The exhibit</span>
            <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={`A quote, a scene, or what ${who} does that shows the read.`} rows={3} className="input-paper resize-y" />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="lab text-[13px]">Source</span>
              <input value={sourceLabel} onChange={(e) => setSourceLabel(e.target.value)} placeholder="Episode, chapter, interview" className="input-paper" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="lab text-[13px]">Link</span>
              <input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://" className="input-paper" />
            </label>
          </div>
          {note && <FormNote error>{note}</FormNote>}
          <div className="flex flex-wrap justify-end gap-3">
            <Btn onClick={() => setShowForm(false)}>Cancel</Btn>
            <Btn type="submit" variant="primary" disabled={submitting || !text.trim()}>
              {submitting ? "Filing" : "File exhibit"}
            </Btn>
          </div>
        </form>
      ) : (
        <div className="flex flex-col gap-2">
          <Typed className="text-[14px] leading-[1.5]">
            {evidence.length === 0 ? "Nothing filed on this read yet." : `This read has ${evidence.length} ${evidence.length === 1 ? "exhibit" : "exhibits"}.`} Add a quote, a scene, or a screenshot that shows how {who} thinks.{" "}
            <button type="button" onClick={() => { setShowForm(true); setNote(""); }} className="text-blue underline hover:text-navy">
              Submit evidence
            </button>
          </Typed>
          {note && <FormNote error>{note}</FormNote>}
        </div>
      )}
    </div>
  );

  const left = evidence.filter((_, i) => i % 2 === 0);
  const right = evidence.filter((_, i) => i % 2 === 1);

  return (
    <div className="flex flex-col gap-[18px]">
      {code && (
        <SectionHead
          size={20}
          title={
            <>
              {code} <span className="font-normal text-steel-2">{systemName}</span>
            </>
          }
          aside={evidence.length > 1 ? "Most convincing first" : undefined}
        />
      )}
      {loading ? (
        <Typed>Opening the exhibits.</Typed>
      ) : evidence.length === 0 ? (
        slot
      ) : (
        <div className="grid gap-[26px] px-1 pt-2 md:grid-cols-2 md:gap-7">
          <div className="flex flex-col gap-[26px]">{left.map((e) => slip(e, evidence.indexOf(e)))}</div>
          <div className="flex flex-col gap-[26px]">
            {right.map((e) => slip(e, evidence.indexOf(e)))}
            {slot}
          </div>
        </div>
      )}
    </div>
  );
}
