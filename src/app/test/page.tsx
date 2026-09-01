import Link from "next/link";

export default function TestIndexPage() {
  return (
    <div className="max-w-lg mx-auto py-12 space-y-6">
      <div className="text-center">
        <h1 className="text-xl font-bold text-[#e8ecf4]">Personality Tests</h1>
        <p className="text-sm text-[#7888a0] mt-1">
          Discover your personality type. Quick, free, no account required.
        </p>
      </div>
      <div className="space-y-3">
        <Link
          href="/test/mbti"
          className="block p-4 rounded-lg border border-[#1a2234] bg-[#0e1420] hover:border-[#64ffda]/40 transition-colors"
        >
          <h2 className="text-base font-semibold text-[#c8d0dc]">MBTI Test</h2>
          <p className="text-sm text-[#7888a0] mt-1">16 questions · 2-3 minutes</p>
          <p className="text-xs text-[#4a5a70] mt-1">Discover your 4-letter personality type (INFP, ENTJ, etc.)</p>
          <div className="flex flex-wrap gap-1 mt-2">
            {["ISTJ", "ENFP", "INTJ", "INFP", "ENTP", "INFJ"].map((t) => (
              <span key={t} className="px-2 py-0.5 text-xs rounded bg-[#2a3f6e] text-[#8ab4f8]">{t}</span>
            ))}
          </div>
        </Link>
        <Link
          href="/test/enneagram"
          className="block p-4 rounded-lg border border-[#1a2234] bg-[#0e1420] hover:border-[#64ffda]/40 transition-colors"
        >
          <h2 className="text-base font-semibold text-[#c8d0dc]">Enneagram Test</h2>
          <p className="text-sm text-[#7888a0] mt-1">9 questions · 1-2 minutes</p>
          <p className="text-xs text-[#4a5a70] mt-1">Find your core Enneagram type with wing (4w5, 7w8, etc.)</p>
          <div className="flex flex-wrap gap-1 mt-2">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((t) => (
              <span key={t} className="px-2 py-0.5 text-xs rounded bg-[#3a2a4e] text-[#d4a0f8]">{t}</span>
            ))}
          </div>
        </Link>
      </div>
    </div>
  );
}