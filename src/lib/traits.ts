/**
 * Vector math for the Talanov-style continuous trait survey.
 *
 * The survey records where readers place a character on 12 trait axes
 * (-3..+3). Each DSM pattern has a reference vector on the same axes. We
 * compare the community's averaged vector against every reference and turn the
 * similarities into a percentage breakdown.
 *
 * Kept free of Prisma/Next imports so it is unit-testable.
 */

export function cosineSimilarity(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

export function euclideanDistance(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += (a[i] - b[i]) ** 2;
  }
  return Math.sqrt(sum);
}

export type SimilarityEntry = { disorderId: string; similarity: number };
export type PercentageEntry = { disorderId: string; similarity: number; percentage: number };

/**
 * Convert cosine similarities into shares that sum to exactly 100.
 *
 * Only positive similarity counts: cosine ranges [-1, 1], and a negative value
 * means the survey points *away* from that pattern, so it must score zero
 * rather than being shifted up into a nonzero share. (Subtracting the minimum
 * used to hand an opposite-trait pattern a real percentage, and the printed
 * total drifted off 100.)
 *
 * Fractional remainders go to the largest fractional parts, so the displayed
 * integers always add to 100.
 */
export function similarityToPercentage(similarities: SimilarityEntry[]): PercentageEntry[] {
  if (similarities.length === 0) return [];

  const weights = similarities.map((s) => Math.max(0, s.similarity));
  const total = weights.reduce((sum, w) => sum + w, 0);

  if (total === 0) {
    return similarities.map((s) => ({
      disorderId: s.disorderId,
      similarity: Math.round(s.similarity * 1000) / 1000,
      percentage: 0,
    }));
  }

  const exact = weights.map((w) => (w / total) * 100);
  const percentages = exact.map((v) => Math.floor(v));
  let remainder = 100 - percentages.reduce((sum, v) => sum + v, 0);

  const byFraction = exact
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac);

  for (let k = 0; k < byFraction.length && remainder > 0; k++, remainder--) {
    percentages[byFraction[k].i]++;
  }

  return similarities.map((s, i) => ({
    disorderId: s.disorderId,
    similarity: Math.round(s.similarity * 1000) / 1000,
    percentage: percentages[i],
  }));
}

export type Verdict =
  | { kind: "empty" }
  | { kind: "none" }
  | { kind: "intermediate"; top: PercentageEntry; second: PercentageEntry }
  | { kind: "accent"; top: PercentageEntry; second: PercentageEntry }
  | { kind: "single"; top: PercentageEntry };

/**
 * Co-morbidity that *emerges from the survey* rather than being hardcoded.
 *
 * When two patterns both score at or above `floor`, the community is reading
 * the character as a blend of them. `strength` is the geometric mean of the two
 * shares, so it stays meaningful whether the pair is (40%, 40%) or (60%, 20%).
 *
 * Returns pairs sorted by strength, strongest first.
 */
export function emergentComorbidities(
  breakdown: PercentageEntry[],
  floor = 20
): { a: PercentageEntry; b: PercentageEntry; strength: number }[] {
  const qualifying = breakdown.filter((b) => b.percentage >= floor);
  const pairs: { a: PercentageEntry; b: PercentageEntry; strength: number }[] = [];

  for (let i = 0; i < qualifying.length; i++) {
    for (let j = i + 1; j < qualifying.length; j++) {
      pairs.push({
        a: qualifying[i],
        b: qualifying[j],
        strength: Math.round(Math.sqrt(qualifying[i].percentage * qualifying[j].percentage) * 10) / 10,
      });
    }
  }

  return pairs.sort((x, y) => y.strength - x.strength);
}

/**
 * Turn a sorted breakdown into the headline read.
 *
 * - `empty`        no votes yet
 * - `none`         nothing clears the 15% floor — the traits fit no pattern
 * - `intermediate` top two within 5 points — "between X and Y"
 * - `accent`       a strong second place (>=15%) — "X with a Y accent"
 * - `single`       one clear winner
 *
 * `breakdown` is expected sorted by percentage descending.
 */
export function describeBreakdown(
  breakdown: PercentageEntry[],
  totalVoters: number,
  noneFloor = 15,
  accentFloor = 15,
  intermediateGap = 5
): Verdict {
  if (totalVoters === 0 || breakdown.length === 0) return { kind: "empty" };

  const [top, second] = breakdown;
  if (!top || top.percentage < noneFloor) return { kind: "none" };
  if (second && top.percentage - second.percentage < intermediateGap) {
    return { kind: "intermediate", top, second };
  }
  if (second && second.percentage >= accentFloor) {
    return { kind: "accent", top, second };
  }
  return { kind: "single", top };
}

export interface Inversion {
  /** Axis slug, e.g. "empathy". */
  slug: string;
  /** Human name for the sentence. */
  name: string;
  /** What the community's survey says about this character. */
  communityValue: number;
  /** What the matched pattern would expect. */
  patternValue: number;
  /** Human label for the pole the community picked. */
  communityLabel: string;
  /** Human label for the pole the pattern expects. */
  patternLabel: string;
  /** |community - pattern|, used to rank the strongest disagreement. */
  gap: number;
}

/**
 * Axes where the community's survey points the *other way* from the pattern it
 * matched. This is what makes "borderline, but far more callous than borderline
 * usually reads" sayable, and it is the design's §4 step 5.
 *
 * An inversion needs a real disagreement, not noise: both values must be
 * beyond `floor` from the neutral midpoint in opposite directions, and the gap
 * between them must clear `minGap`. Results come back strongest-gap first.
 */
export function findInversions(
  traitAverages: { slug: string; name: string; avg: number; lowLabel: string; highLabel: string }[],
  patternValues: number[],
  floor = 1,
  minGap = 3
): Inversion[] {
  const out: Inversion[] = [];

  traitAverages.forEach((t, i) => {
    const community = t.avg;
    const pattern = patternValues[i];
    if (pattern === undefined) return;

    // Opposite poles, each clearly off centre.
    const opposed = community * pattern < 0;
    if (!opposed) return;
    if (Math.abs(community) < floor || Math.abs(pattern) < floor) return;

    const gap = Math.abs(community - pattern);
    if (gap < minGap) return;

    out.push({
      slug: t.slug,
      name: t.name,
      communityValue: Math.round(community * 100) / 100,
      patternValue: pattern,
      communityLabel: community > 0 ? t.highLabel : t.lowLabel,
      patternLabel: pattern > 0 ? t.highLabel : t.lowLabel,
      gap: Math.round(gap * 100) / 100,
    });
  });

  return out.sort((a, b) => b.gap - a.gap);
}

/** "X, inverted to empathy" — the headline phrase, or null when there is no clear inversion. */
export function describeInversion(patternName: string, inversions: Inversion[]): string | null {
  const top = inversions[0];
  if (!top) return null;
  return `${patternName}, inverted to ${top.name.toLowerCase()}`;
}
