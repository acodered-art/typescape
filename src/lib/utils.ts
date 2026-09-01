export function calcConsensus(
  votes: { voteValue: number; weight: number }[],
  minVoters = 5
): { percentage: number; weightedSum: number; totalWeight: number; voteCount: number } {
  const voteCount = votes.length;
  if (voteCount < minVoters) {
    return { percentage: 0, weightedSum: 0, totalWeight: 0, voteCount };
  }

  let weightedSum = 0;
  let totalWeight = 0;

  for (const v of votes) {
    weightedSum += v.voteValue * v.weight;
    totalWeight += Math.abs(v.voteValue) * v.weight;
  }

  // Scale to 0-100
  const percentage = totalWeight > 0
    ? Math.round(((weightedSum + totalWeight) / (2 * totalWeight)) * 100)
    : 0;

  return { percentage, weightedSum, totalWeight, voteCount };
}

export function calcVoteWeight(reputation: number): number {
  const weight = 1.0 + (reputation / 1000) * 0.5;
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