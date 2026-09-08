"use client";
import { useState } from "react";
import { Btn, SectionHead, Sheet, Typed } from "@/components/dossier";
import { SelectPaper } from "@/components/dossier/modal";

/**
 * Two readings in, a compatibility report out. Stateless and shareable: the
 * result is written to the query string so the link can be sent to the other
 * person.
 */

const SYSTEMS = [
  { slug: "mbti", name: "MBTI", types: ["INTJ", "INTP", "ENTJ", "ENTP", "INFJ", "INFP", "ENFJ", "ENFP", "ISTJ", "ISFJ", "ESTJ", "ESFJ", "ISTP", "ISFP", "ESTP", "ESFP"] },
  { slug: "enneagram", name: "Enneagram", types: ["1", "2", "3", "4", "5", "6", "7", "8", "9"] },
  { slug: "big-five", name: "Big Five", types: ["O", "C", "E", "A", "N"] },
];

interface Report {
  a: { label: string };
  b: { label: string };
  score: number | null;
  basis: string;
  summary: string;
  agreements: string[];
  divergences: string[];
}

function Side({
  side,
  system,
  type,
  onSystem,
  onType,
  label,
}: {
  side: string;
  system: string;
  type: string;
  onSystem: (v: string) => void;
  onType: (v: string) => void;
  label: string;
}) {
  const active = SYSTEMS.find((s) => s.slug === system) ?? SYSTEMS[0];
  return (
    <div className="flex flex-col gap-2">
      <span className="lab">{side}</span>
      <SelectPaper value={system} onChange={(e) => onSystem(e.target.value)}>
        {SYSTEMS.map((s) => (
          <option key={s.slug} value={s.slug}>{s.name}</option>
        ))}
      </SelectPaper>
      <SelectPaper value={type} onChange={(e) => onType(e.target.value)}>
        <option value="">—</option>
        {active.types.map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </SelectPaper>
      {label && <Typed className="text-[12px] text-navy">{label}</Typed>}
    </div>
  );
}

export function CompatibilityForm() {
  const [sysA, setSysA] = useState("mbti");
  const [typeA, setTypeA] = useState("");
  const [sysB, setSysB] = useState("enneagram");
  const [typeB, setTypeB] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const run = async () => {
    if (!typeA || !typeB) {
      setError("Pick a type for both readings.");
      return;
    }
    setError("");
    setLoading(true);
    setReport(null);
    try {
      const res = await fetch("/api/compatibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          a: { system: sysA, type: typeA },
          b: { system: sysB, type: typeB },
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Could not build the report.");
        return;
      }
      setReport(json as Report);
      window.history.replaceState(
        null,
        "",
        `/compatibility?a=${sysA}:${encodeURIComponent(typeA)}&b=${sysB}:${encodeURIComponent(typeB)}`
      );
    } catch {
      setError("Network error — try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Sheet className="flex flex-col gap-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Side side="Your reading" system={sysA} type={typeA} onSystem={(v) => { setSysA(v); setTypeA(""); }} onType={setTypeA} label="" />
          <Side side="Their reading" system={sysB} type={typeB} onSystem={(v) => { setSysB(v); setTypeB(""); }} onType={setTypeB} label="" />
        </div>
        {error && <Typed className="text-[13px] text-white/90">{error}</Typed>}
        <div>
          <Btn variant="primary" onClick={run} disabled={loading}>
            {loading ? "Reading the files" : "Compare readings"}
          </Btn>
        </div>
      </Sheet>

      {report && (
        <Sheet className="flex flex-col gap-3 p-5">
          <SectionHead title={`${report.a.label} · ${report.b.label}`} size={20} />
          <div className="flex items-baseline gap-3">
            <span className="font-typed text-[40px] font-bold text-blue">
              {report.score === null ? "—" : `${report.score}%`}
            </span>
            <Typed className="text-[13px]">{report.summary}</Typed>
          </div>
          {report.agreements.length > 0 && (
            <ul className="flex flex-col gap-1">
              {report.agreements.map((a, i) => (
                <li key={i} className="text-[14px] leading-[1.5]">{a}</li>
              ))}
            </ul>
          )}
          {report.divergences.length > 0 && (
            <ul className="flex flex-col gap-1 border-t border-steel pt-2">
              {report.divergences.map((d, i) => (
                <li key={i} className="font-typed text-[13px] leading-[1.5] text-navy">{d}</li>
              ))}
            </ul>
          )}
          {report.score === null && (
            <Typed className="text-[12px]">
              No score is shown rather than a made-up number.
            </Typed>
          )}
        </Sheet>
      )}
    </div>
  );
}
