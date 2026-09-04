import Link from "next/link";

interface TypingBadgeProps {
  systemSlug: string;
  systemName: string;
  typeValue: string;
  confidence: number;
  voteCount?: number;
  /** blue = the leading or certified read, navy = secondary or an individual reader's read */
  tone?: "blue" | "navy";
  /** print the system name after the code (typed, small) */
  showSystem?: boolean;
  /** print the agreement percentage after the code */
  showConfidence?: boolean;
}

/**
 * A type code as a chip, linking to the search for that read.
 * The Dossier shows the code alone (INTJ, 5w6, LSI); the system rides in the title and, where a list mixes systems, after the code.
 */
export function TypingBadge({ systemSlug, systemName, typeValue, confidence, tone = "blue", showSystem = false, showConfidence = false }: TypingBadgeProps) {
  return (
    <Link
      href={`/search?type=${encodeURIComponent(typeValue)}&system=${systemSlug}`}
      className={`chip inline-flex items-baseline gap-1.5 ${tone === "navy" ? "chip-navy" : ""}`}
      title={`${typeValue}, ${systemName}`}
    >
      <span>{typeValue}</span>
      {showSystem && <span className="text-[11px] font-normal uppercase tracking-[0.1em] text-steel-2">{systemName}</span>}
      {showConfidence && confidence > 0 && <span className="font-normal text-steel-2">{Math.round(confidence * 100)}%</span>}
    </Link>
  );
}
