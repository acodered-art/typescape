"use client";
import { useState } from "react";
import Link from "next/link";
import { TYPING_SYSTEMS } from "@/lib/typing-systems";

interface CompareResult {
  type1: { type: string; system: string; count: number; examples: { name: string; slug: string }[] };
  type2: { type: string; system: string; count: number; examples: { name: string; slug: string }[] };
  sharedProfiles: number;
  commonProfiles: { name: string; slug: string }[];
}

export default function CompareForm() {
  const [system1, setSystem1] = useState("mbti");
  const [type1, setType1] = useState("");
  const [system2, setSystem2] = useState("mbti");
  const [type2, setType2] = useState("");
  const [result, setResult] = useState<CompareResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const sys1 = TYPING_SYSTEMS.find((s) => s.slug === system1);
  const sys2 = TYPING_SYSTEMS.find((s) => s.slug === system2);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!type1 || !type2) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch(`/api/compare?type1=${type1}&system1=${system1}&type2=${type2}&system2=${system2}`);
      if (res.ok) setResult(await res.json());
      else setError("Failed to compare");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4 p-4 rounded-lg border border-[#1a2234] bg-[#0e1420]">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs text-[#7888a0]">System 1</label>
            <select value={system1} onChange={(e) => { setSystem1(e.target.value); setType1(""); }}
              className="w-full px-2 py-1.5 text-sm bg-[#141c2b] border border-[#1a2234] rounded text-[#c8d0dc]">
              {TYPING_SYSTEMS.filter(s => s.types?.length).map(s => (
                <option key={s.slug} value={s.slug}>{s.name}</option>
              ))}
            </select>
            <select value={type1} onChange={(e) => setType1(e.target.value)}
              className="w-full px-2 py-1.5 text-sm bg-[#141c2b] border border-[#1a2234] rounded text-[#c8d0dc]">
              <option value="">Select type...</option>
              {sys1?.types?.map(t => (
                <option key={t.value} value={t.value}>{t.value}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs text-[#7888a0]">System 2</label>
            <select value={system2} onChange={(e) => { setSystem2(e.target.value); setType2(""); }}
              className="w-full px-2 py-1.5 text-sm bg-[#141c2b] border border-[#1a2234] rounded text-[#c8d0dc]">
              {TYPING_SYSTEMS.filter(s => s.types?.length).map(s => (
                <option key={s.slug} value={s.slug}>{s.name}</option>
              ))}
            </select>
            <select value={type2} onChange={(e) => setType2(e.target.value)}
              className="w-full px-2 py-1.5 text-sm bg-[#141c2b] border border-[#1a2234] rounded text-[#c8d0dc]">
              <option value="">Select type...</option>
              {sys2?.types?.map(t => (
                <option key={t.value} value={t.value}>{t.value}</option>
              ))}
            </select>
          </div>
        </div>
        <button type="submit" disabled={loading || !type1 || !type2}
          className="w-full px-4 py-2 text-sm rounded bg-[#64ffda]/10 text-[#64ffda] border border-[#64ffda]/20 hover:bg-[#64ffda]/20 disabled:opacity-30">
          {loading ? "Comparing..." : "Compare"}
        </button>
      </form>

      {error && <div className="p-3 rounded border border-[#ff6b6b]/40 bg-[#ff6b6b]/10 text-sm text-[#ff6b6b]">{error}</div>}

      {result && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded border border-[#1a2234] bg-[#0e1420]">
              <div className="text-lg font-bold text-[#8ab4f8]">{result.type1.type}</div>
              <div className="text-xs text-[#4a5a70]">{result.type1.count} profiles</div>
              {result.type1.examples.length > 0 && (
                <div className="mt-2 space-y-1">
                  <div className="text-xs text-[#7888a0]">Notable:</div>
                  {result.type1.examples.map(p => (
                    <Link key={p.slug} href={`/profiles/${p.slug}`} className="block text-xs text-[#64ffda] hover:underline">{p.name}</Link>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 rounded border border-[#1a2234] bg-[#0e1420]">
              <div className="text-lg font-bold text-[#d4a0f8]">{result.type2.type}</div>
              <div className="text-xs text-[#4a5a70]">{result.type2.count} profiles</div>
              {result.type2.examples.length > 0 && (
                <div className="mt-2 space-y-1">
                  <div className="text-xs text-[#7888a0]">Notable:</div>
                  {result.type2.examples.map(p => (
                    <Link key={p.slug} href={`/profiles/${p.slug}`} className="block text-xs text-[#64ffda] hover:underline">{p.name}</Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {result.commonProfiles.length > 0 && (
            <div className="p-4 rounded border border-[#1a2234] bg-[#0e1420]">
              <h3 className="text-sm font-semibold text-[#c8d0dc] mb-2">
                Profiles typed as both ({result.sharedProfiles})
              </h3>
              <div className="flex flex-wrap gap-2">
                {result.commonProfiles.map(p => (
                  <Link key={p.slug} href={`/profiles/${p.slug}`}
                    className="px-2 py-1 text-xs rounded bg-[#141c2b] border border-[#1a2234] text-[#c8d0dc] hover:border-[#64ffda]/40">
                    {p.name}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {result.commonProfiles.length === 0 && (
            <div className="p-4 rounded border border-[#1a2234] bg-[#0e1420] text-center">
              <p className="text-sm text-[#4a5a70]">No profiles share both types yet.</p>
              <p className="text-xs text-[#4a5a70] mt-1">Be the first to type a character as both!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}