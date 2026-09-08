/**
 * Moderation assist.
 *
 * The incumbent site's most-cited failure is a hostile, stereotyping comment
 * culture. Full ML moderation is out of scope, but a deterministic rules pass
 * catches the patterns that actually cause the damage and costs nothing to run
 * on every submission.
 *
 * Deliberately conservative and explainable: every flag names the rule that
 * fired, so a moderator can see *why* something was queued and a false positive
 * is arguable rather than mysterious.
 *
 * Pure and dependency-free so it is unit-testable and can run inline in a route.
 */

export type Severity = "info" | "warn" | "block";

export interface ModerationFlag {
  rule: string;
  severity: Severity;
  /** The matched text, trimmed for display. */
  match: string;
  /** Why it matters, written for a moderator. */
  note: string;
}

export interface ModerationVerdict {
  /** Highest severity across all flags; "info" when nothing fired. */
  severity: Severity;
  /** True when the content should be held for review rather than published. */
  hold: boolean;
  flags: ModerationFlag[];
  /** 0-100, higher = more likely to need review. */
  risk: number;
}

interface Rule {
  name: string;
  severity: Severity;
  /** Weight toward the risk score. */
  weight: number;
  note: string;
  pattern: RegExp;
}

/**
 * Rules are ordered by how badly they break the site's stated norms. Slurs and
 * harassment are `block`; clinical claims and stereotyping are `warn` because
 * they are usually ignorance rather than malice.
 */
const RULES: Rule[] = [
  {
    name: "harassment",
    severity: "block",
    weight: 45,
    note: "Direct insult aimed at a person.",
    pattern: /\b(you(?:'re| are)? (?:an? )?(?:idiot|moron|retard|loser|stupid|pathetic|worthless|trash))\b/i,
  },
  {
    name: "slur",
    severity: "block",
    weight: 60,
    note: "Slur or slur-adjacent term.",
    pattern: /\b(?:f[a@]g|n[i1]gg|r[e3]t[a@]rd|k[i1]k[e3]|sp[i1]c|ch[i1]nk|tr[a@]nn[yi])\w*\b/i,
  },
  {
    name: "threat",
    severity: "block",
    weight: 55,
    note: "Threat of violence.",
    pattern: /\b(?:kill|murder|beat|hurt|doxx?)\s+(?:you|him|her|them|u)\b/i,
  },
  {
    name: "stereotyping",
    severity: "warn",
    weight: 25,
    note: "Claims a type is inherently superior or that all members share a trait.",
    pattern: /\b(?:all|every|no)\s+[A-Z]{4}s?\b|\b(?:best|worst|superior|inferior)\s+(?:type|mbti|enneagram)\b|\btypes?\s+are\s+(?:better|worse)\b/i,
  },
  {
    name: "gatekeeping",
    severity: "warn",
    weight: 20,
    note: "Tells someone they are not allowed to participate or are mistyped by identity.",
    pattern: /\b(?:you(?:'re| are)? not (?:a|an|really)|fake|poser|mistyped loser)\b/i,
  },
  {
    name: "clinical-claim",
    severity: "warn",
    weight: 20,
    note: "Diagnoses a real person with a disorder.",
    pattern: /\b(?:has|is|suffers? from|diagnos(?:ed|is) with)\s+(?:bpd|npd|aspd|ocpd|bipolar|schizophreni\w*|autis\w*|adhd|psyc?hopath\w*|sociopath\w*)\b/i,
  },
  {
    name: "self-harm",
    severity: "block",
    weight: 50,
    note: "References self-harm; route to a human, do not publish unassisted.",
    pattern: /\b(?:kill myself|kys|end (?:my|your) life|suicid)/i,
  },
];

/** Normalise for matching: collapse whitespace, strip zero-width joiners. */
function normalise(text: string): string {
  return text.replace(/[\u200B-\u200D\uFEFF]/g, "").replace(/\s+/g, " ").trim();
}

export function moderate(text: string): ModerationVerdict {
  const clean = normalise(text);
  if (clean.length === 0) {
    return { severity: "info", hold: false, flags: [], risk: 0 };
  }

  const flags: ModerationFlag[] = [];
  let risk = 0;

  for (const rule of RULES) {
    const m = clean.match(rule.pattern);
    if (!m) continue;
    flags.push({
      rule: rule.name,
      severity: rule.severity,
      match: m[0].slice(0, 80),
      note: rule.note,
    });
    risk += rule.weight;
  }

  // Excessive shouting is a weak signal on its own, never a hold.
  const letters = clean.replace(/[^A-Za-z]/g, "");
  if (letters.length >= 20) {
    const caps = (clean.match(/[A-Z]/g) ?? []).length / letters.length;
    if (caps > 0.7) {
      flags.push({
        rule: "shouting",
        severity: "info",
        match: clean.slice(0, 40),
        note: "Mostly capital letters.",
      });
      risk += 5;
    }
  }

  const severity: Severity = flags.some((f) => f.severity === "block")
    ? "block"
    : flags.some((f) => f.severity === "warn")
      ? "warn"
      : "info";

  return {
    severity,
    // Only blocking content is held automatically; warnings are surfaced to
    // moderators but do not stop publication (avoids silencing discussion).
    hold: severity === "block",
    flags,
    risk: Math.min(100, risk),
  };
}
