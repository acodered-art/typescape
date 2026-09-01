import Link from "next/link";
import { SYSTEM_COLORS } from "@/lib/typing-systems";

interface TypingBadgeProps {
  systemSlug: string;
  systemName: string;
  typeValue: string;
  confidence: number;
  voteCount?: number;
}

export function TypingBadge({ systemSlug, systemName, typeValue, confidence, voteCount }: TypingBadgeProps) {
  const colors = SYSTEM_COLORS[systemSlug] || "bg-[#1a2234] text-[#7888a0] border-[#2a3a4a]";

  return (
    <Link
      href={`/search?type=${typeValue}&system=${systemSlug}`}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-medium ${colors} hover:opacity-80 transition-opacity`}
    >
      <span className="uppercase">{systemName}</span>
      <span className="font-bold">{typeValue}</span>
      {confidence > 0 && (
        <span className="opacity-60">{Math.round(confidence * 100)}%</span>
      )}
    </Link>
  );
}