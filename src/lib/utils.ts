/**
 * Agreement percentage for a set of weighted votes, 0–100.
 *
 * `percentage` is the share of total weight that voted *up*:
 *
 *   sum(voteValue * weight) + sum(|voteValue| * weight)
 *   ──────────────────────────────────────────────────── × 100
 *             2 × sum(|voteValue| * weight)
 *
 * which collapses to `upWeight / totalWeight`. All up → 100, all down → 0,
 * a weight-2 up against a weight-1 down → 66.7.
 *
 * Values are coerced to valid `-1 | 1` and weights to finite non-negative
 * numbers; a malformed row is ignored rather than allowed to skew the result
 * (a single `NaN` weight previously zeroed the whole percentage).
 *
 * Below `minVoters` the result reports `hasConsensus: false` instead of a
 * percentage that is indistinguishable from a genuine 0% agreement. Callers
 * that want to show a number anyway pass `minVoters = 0`.
 */
export function calcConsensus(
  votes: { voteValue: number; weight: number }[],
  minVoters = 5
): {
  percentage: number;
  weightedSum: number;
  totalWeight: number;
  voteCount: number;
  hasConsensus: boolean;
} {
  const voteCount = votes.length;
  if (voteCount < minVoters) {
    return {
      percentage: 0,
      weightedSum: 0,
      totalWeight: 0,
      voteCount,
      hasConsensus: false,
    };
  }

  let weightedSum = 0;
  let totalWeight = 0;

  for (const v of votes) {
    const value = v.voteValue >= 0 ? 1 : -1;
    const weight =
      typeof v.weight === "number" && Number.isFinite(v.weight) && v.weight > 0
        ? v.weight
        : 1; // treat a missing/NaN/non-positive weight as the baseline 1.0
    weightedSum += value * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) {
    return {
      percentage: 0,
      weightedSum: 0,
      totalWeight: 0,
      voteCount,
      hasConsensus: false,
    };
  }

  const percentage = Math.round(((weightedSum + totalWeight) / (2 * totalWeight)) * 100);

  return { percentage, weightedSum, totalWeight, voteCount, hasConsensus: true };
}

/**
 * Reputation → vote weight multiplier. 1.0 at zero reputation, +0.5 per 1000
 * points, capped at 3.0 (reached at ~4000 reputation).
 */
export function calcVoteWeight(reputation: number): number {
  const rep = Number.isFinite(reputation) && reputation > 0 ? reputation : 0;
  const weight = 1.0 + (rep / 1000) * 0.5;
  return Math.min(weight, 3.0);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

export function generateSlug(name: string, id?: string): string {
  const base = slugify(name);
  if (!id) return base;
  return `${base}-${id.slice(0, 8)}`;
}