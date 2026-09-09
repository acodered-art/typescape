/**
 * Derive trait-survey values from a type assignment.
 *
 * The survey is the richest signal on the site, but almost nobody has surveyed
 * anything, so every vector feature (similarity, radar, co-morbidity, the daily
 * pick) runs on an empty dataset. This fills the gap honestly: it maps a *type*
 * the community already agreed on onto the 12 trait axes, and labels the result
 * as derived rather than surveyed.
 *
 * Two rules keep this from being fabrication:
 *
 *   1. **Every axis traces to a stated reason.** A value is only produced when a
 *      dimension of the source system actually speaks to that axis. No axis is
 *      filled in "to complete the vector".
 *   2. **Confidence is reported per vector, and the site treats derived data as
 *      weaker than a real survey.** It seeds the maths; it does not pretend to
 *      be community opinion.
 *
 * Pure and dependency-free so it is unit-testable.
 */

export type Axes = {
  "emotional-stability": number;
  "social-orientation": number;
  "self-confidence": number;
  "impulse-control": number;
  trust: number;
  anxiety: number;
  conventionality: number;
  flexibility: number;
  empathy: number;
  "attention-seeking": number;
  "emotional-expression": number;
  conscience: number;
};

export const AXIS_ORDER = [
  "emotional-stability",
  "social-orientation",
  "self-confidence",
  "impulse-control",
  "trust",
  "anxiety",
  "conventionality",
  "flexibility",
  "empathy",
  "attention-seeking",
  "emotional-expression",
  "conscience",
] as const;

export type AxisName = (typeof AXIS_ORDER)[number];

export interface Derivation {
  /** One entry per axis, in AXIS_ORDER. Null where the type says nothing. */
  values: (number | null)[];
  /** Which rule produced each value, for the audit trail. */
  reasons: Record<string, string>;
  /** 0-1: how many axes were informed, weighted by how directly. */
  confidence: number;
  /** Axes the source type genuinely spoke to. */
  covered: number;
}

/* ── MBTI ──────────────────────────────────────────────────── */

/**
 * Each MBTI dichotomy moves specific axes. The offsets are deliberately small
 * (1 unit on a -3..3 scale): a letter is weak evidence about a trait, and
 * stacking them should not produce a caricature at the extremes.
 */
const MBTI_RULES: Record<string, Partial<Record<AxisName, number>>> = {
  E: { "social-orientation": 2, "attention-seeking": 1, "emotional-expression": 1 },
  I: { "social-orientation": -2, "attention-seeking": -1, "emotional-expression": -1 },
  S: { conventionality: -1, flexibility: -1 },
  N: { conventionality: 1, flexibility: 1 },
  T: { empathy: -2, conscience: -1 },
  F: { empathy: 2, conscience: 1 },
  J: { flexibility: -2, conventionality: -1 },
  P: { flexibility: 2 },
};

function deriveMbti(type: string): Derivation {
  const letters = type.toUpperCase().split("");
  const values: (number | null)[] = AXIS_ORDER.map(() => null);
  const reasons: Record<string, string> = {};

  for (const letter of letters) {
    const rule = MBTI_RULES[letter];
    if (!rule) continue;
    for (const [axis, delta] of Object.entries(rule) as [AxisName, number][]) {
      const i = AXIS_ORDER.indexOf(axis);
      const current = values[i];
      values[i] = clamp((current ?? 0) + delta);
      reasons[axis] = reasons[axis] ? `${reasons[axis]} + ${letter}` : `${letter}`;
    }
  }

  return finalise(values, reasons);
}

/* ── Enneagram ─────────────────────────────────────────────── */

/**
 * The nine types, described by their core motivation rather than their
 * behaviour (which is what the axes measure). Only the axes the type is
 * genuinely defined by.
 */
const ENNEAGRAM_RULES: Record<string, Partial<Record<AxisName, number>>> = {
  "1": { conscience: 3, flexibility: -2, "impulse-control": -2, "emotional-expression": -1 },
  "2": { empathy: 3, "attention-seeking": 1, "self-confidence": -1, "social-orientation": 2 },
  "3": { "self-confidence": 2, "attention-seeking": 2, "emotional-stability": 1, empathy: -1 },
  "4": { "emotional-stability": -2, "emotional-expression": 2, "attention-seeking": 1, conventionality: 2, "self-confidence": -1 },
  "5": { "social-orientation": -2, "emotional-expression": -2, anxiety: 1, "self-confidence": -1 },
  "6": { anxiety: 3, trust: -1, conscience: 1, "self-confidence": -2 },
  "7": { "impulse-control": 2, "emotional-stability": 1, anxiety: -2, "attention-seeking": 1 },
  "8": { "self-confidence": 3, "impulse-control": 1, empathy: -2, "emotional-expression": 1, conscience: -2 },
  "9": { "emotional-stability": 2, "impulse-control": -1, "self-confidence": -1, "attention-seeking": -2 },
};

function deriveEnneagram(type: string): Derivation {
  // `1`-`9`, optionally with a wing (`4w5`). Anchored and bounded so `99` or
  // `10` is rejected rather than silently read as type 9 or 1.
  const core = type.trim().match(/^([1-9])(?:w[1-9])?$/i)?.[1] ?? "";
  const values: (number | null)[] = AXIS_ORDER.map(() => null);
  const reasons: Record<string, string> = {};

  const rule = ENNEAGRAM_RULES[core];
  if (rule) {
    for (const [axis, delta] of Object.entries(rule) as [AxisName, number][]) {
      values[AXIS_ORDER.indexOf(axis)] = clamp(delta);
      reasons[axis] = `Enneagram ${core}`;
    }
  }

  return finalise(values, reasons, 0.85);
}

/* ── Big Five ──────────────────────────────────────────────── */

/** OCEAN maps more directly onto the axes than anything else here. */
const BIG_FIVE_RULES: Record<string, Partial<Record<AxisName, number>>> = {
  O: { conventionality: 2, flexibility: 1 },
  C: { conscience: 2, "impulse-control": -2, flexibility: -1 },
  E: { "social-orientation": 3, "attention-seeking": 1, "emotional-expression": 1 },
  A: { empathy: 3, trust: 1, conscience: 1 },
  N: { "emotional-stability": -2, anxiety: 3 },
};

function deriveBigFive(type: string): Derivation {
  const values: (number | null)[] = AXIS_ORDER.map(() => null);
  const reasons: Record<string, string> = {};

  // Accept "O:85 C:70..." and "OCEAN" style strings.
  const facets = type.toUpperCase().match(/[OCEAN]/g) ?? [];
  for (const facet of facets) {
    const rule = BIG_FIVE_RULES[facet];
    if (!rule) continue;
    for (const [axis, delta] of Object.entries(rule) as [AxisName, number][]) {
      const i = AXIS_ORDER.indexOf(axis);
      values[i] = clamp((values[i] ?? 0) + delta);
      reasons[axis] = reasons[axis] ? `${reasons[axis]} + ${facet}` : facet;
    }
  }

  return finalise(values, reasons);
}

/* ── helpers ───────────────────────────────────────────────── */

function clamp(v: number): number {
  return Math.max(-3, Math.min(3, Math.round(v)));
}

/**
 * Coverage-based confidence. An MBTI code touches ~9 of 12 axes; an Enneagram
 * core touches ~5. Neither is a survey, so the ceiling is 0.8 — a derived
 * vector can never claim the authority of one a reader filled in.
 */
function finalise(values: (number | null)[], reasons: Record<string, string>, cap = 0.8): Derivation {
  const covered = values.filter((v) => v !== null).length;
  return {
    values,
    reasons,
    covered,
    confidence: Math.round(Math.min(cap, (covered / AXIS_ORDER.length) * cap) * 100) / 100,
  };
}

/**
 * Derive a vector from every typing a profile has, merging them.
 *
 * Where two systems agree on an axis the value averages; where only one speaks,
 * that one decides. `sources` records which systems contributed, so the site can
 * say "derived from MBTI and Enneagram" rather than implying a survey happened.
 */
export function deriveVector(typings: { system: string; type: string }[]): Derivation & {
  sources: string[];
} {
  const sums: number[] = AXIS_ORDER.map(() => 0);
  const counts: number[] = AXIS_ORDER.map(() => 0);
  const reasons: Record<string, string> = {};
  const sources: string[] = [];

  for (const t of typings) {
    let d: Derivation | null = null;
    if (t.system === "mbti") d = deriveMbti(t.type);
    else if (t.system === "enneagram") d = deriveEnneagram(t.type);
    else if (t.system === "big-five") d = deriveBigFive(t.type);
    if (!d) continue;

    sources.push(t.system);
    d.values.forEach((v, i) => {
      if (v === null) return;
      sums[i] += v;
      counts[i] += 1;
      reasons[AXIS_ORDER[i]] = d!.reasons[AXIS_ORDER[i]] ?? t.system;
    });
  }

  const values = sums.map((s, i) => (counts[i] === 0 ? null : Math.round((s / counts[i]) * 100) / 100));
  const covered = values.filter((v) => v !== null).length;

  return {
    values,
    reasons,
    covered,
    confidence: Math.round(Math.min(0.8, (covered / AXIS_ORDER.length) * 0.8) * 100) / 100,
    sources: [...new Set(sources)],
  };
}
