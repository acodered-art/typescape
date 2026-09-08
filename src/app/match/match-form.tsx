"use client";
import { useState } from "react";
import Link from "next/link";
import { Btn, Section, SectionHead, Sheet, Typed } from "@/components/dossier";
import { SelectPaper } from "@/components/dossier/modal";

/**
 * "Which character are you?" — a two-field form and the ranked file cards.
 *
 * No account needed: the endpoint takes the two results and scores the corpus.
 * The result is shareable via a query string so the page can be linked.
 */

const MBTI_TYPES = [
  "INTJ", "INTP", "ENTJ", "ENTP",
  "INFJ", "INFP", "ENFJ", "ENFP",
  "ISTJ", "ISFJ", "ESTJ", "ESFJ",
  "ISTP", "ISFP", "ESTP", "ESFP",
];

const ENNEA = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
const WINGS = ["", "w1", "w2", "w3", "w4", "w5", "w6", "w7", "w8", "w9"];

interface MatchResult {
  slug: string;
  name: string;
  imageUrl: string | null;
  category: { name: string; slug: string } | null;
  score: number;
  strength: number;
  reasons: string[];
  mbti: string | null;
  enneagram: string | null;
}

interface MatchResponse {
  input: { mbti: string | null; enneagram: string | null };
  matched: number;
  maxScore: number;
  results: MatchResult[];
}

export function MatchForm() {
  const [mbti, setMbti] = useState("");
  const [core, setCore] = useState("");
  const [wing, setWing] = useState("");
  const [data, setData] = useState<MatchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const run = async () => {
    const enneagram = core ? `${core}${wing}` : "";
    if (!mbti && !enneagram) {
      setError("Pick an MBTI type, an Enneagram type, or both.");
      return;
    }
    setError("");
    setLoading(true);
    setData(null);
    try {
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mbti: mbti || undefined, enneagram: enneagram || undefined }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "The files could not be searched.");
        return;
      }
      setData(json as MatchResponse);
      // Make the result linkable/shareable without a round trip.
      const qs = new URLSearchParams();
      if (mbti) qs.set("mbti", mbti);
      if (enneagram) qs.set("enneagram", enneagram);
      window.history.replaceState(null, "", `/match?${qs.toString()}`);
    } catch {
      setError("Network error — try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Sheet className="flex flex-col gap-4 p-5">
        <span className="lab">Your reading</span>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="lab">MBTI</span>
            <SelectPaper value={mbti} onChange={(e) => setMbti(e.target.value)}>
              <option value="">—</option>
              {MBTI_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </SelectPaper>
          </label>
          <div className="flex flex-col gap-1">
            <span className="lab">Enneagram</span>
            <div className="flex gap-2">
              <SelectPaper value={core} onChange={(e) => setCore(e.target.value)} className="flex-1">
                <option value="">—</option>
                {ENNEA.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </SelectPaper>
              <SelectPaper value={wing} onChange={(e) => setWing(e.target.value)} className="w-[110px]">
                {WINGS.map((w) => (
                  <option key={w || "none"} value={w}>{w || "no wing"}</option>
                ))}
              </SelectPaper>
            </div>
          </div>
        </div>
        {error && <Typed className="text-base text-white/90">{error}</Typed>}
        <div className="flex items-center gap-3">
          <Btn variant="primary" onClick={run} disabled={loading}>
            {loading ? "Searching the files" : "Find my match"}
          </Btn>
          {data && (
            <Typed className="text-base">
              {data.matched === 1 ? "One file" : `${data.matched} files`} matched
            </Typed>
          )}
        </div>
      </Sheet>

      {data && data.results.length > 0 && (
        <Section>
          <SectionHead
            title="Closest files"
            aside={data.input.mbti && data.input.enneagram ? `${data.input.mbti} · ${data.input.enneagram}` : data.input.mbti || data.input.enneagram}
          />
          <div className="flex flex-col gap-4">
            {data.results.map((r, i) => (
              <Sheet key={r.slug} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 flex-col gap-1">
                    <Link href={`/profiles/${r.slug}`} className="font-display text-7xl font-extrabold uppercase leading-tight hover:text-navy">
                      {r.name}
                    </Link>
                    <Typed className="text-sm text-navy">
                      {i === 0 ? "Closest match · " : ""}
                      {r.reasons.join(" · ")}
                    </Typed>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="font-typed text-5xl font-bold text-blue">{r.strength}%</span>
                    <span className="font-typed text-xs text-steel-2">score {r.score}</span>
                  </div>
                </div>
                <div className="mt-3 h-2 bg-paper-2">
                  <div className="h-2 bg-blue" style={{ width: `${r.strength}%` }} />
                </div>
              </Sheet>
            ))}
          </div>
        </Section>
      )}

      {data && data.results.length === 0 && (
        <Sheet className="p-5">
          <Typed>
            No file in the database carries that reading yet. Browse the catalogue and file a
            finding, and the match will pick it up.
          </Typed>
          <div className="mt-3">
            <Btn href="/search">Browse the catalogue</Btn>
          </div>
        </Sheet>
      )}
    </div>
  );
}
