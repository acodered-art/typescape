/**
 * Contested-reading detection.
 *
 * The community's centrepiece complaint about the incumbent site is that a
 * typing calcifies: a stale plurality keeps a wrong read on top because there
 * is no way to register *disagreement* short of a plain downvote.
 *
 * A reading is "contested" when the evidence filed against it tells a different
 * story from the votes: either the vote split is genuinely close, or the filed
 * evidence leans negative while the votes still read positive. Surfacing that
 * lets a reader see the argument instead of just the number.
 *
 * Pure so it can be unit-tested and reused by both the API and the UI.
 */

export interface ContestedInput {
  votes: { voteValue: number; weight: number }[];
  /** Evidence items; `voteCount` is the community's score for each. */
  evidence: { voteCount: number }[];
}

export interface ContestedResult {
  /** The reading is close enough that either side could win. */
  contested: boolean;
  /** Human-readable reason, empty when not contested. */
  reason: string;
  /** Signed vote margin, -1..1 (positive = the read is holding). */
  voteMargin: number;
  /** How many evidence items lean negative. */
  negativeEvidence: number;
  positiveEvidence: number;
  voterCount: number;
}

/** A split tighter than this reads as "still being argued". */
const CLOSE_MARGIN = 0.2;
const MIN_VOTERS = 3;

export function detectContested({ votes, evidence }: ContestedInput): ContestedResult {
  const voterCount = votes.length;

  if (voterCount < MIN_VOTERS) {
    return {
      contested: false,
      reason: "",
      voteMargin: 0,
      negativeEvidence: 0,
      positiveEvidence: 0,
      voterCount,
    };
  }

  const forWeight = votes.reduce(
    (sum, v) => (v.voteValue > 0 ? sum + v.weight : sum),
    0
  );
  const againstWeight = votes.reduce(
    (sum, v) => (v.voteValue < 0 ? sum + v.weight : sum),
    0
  );
  const total = forWeight + againstWeight;
  // 1 = unanimous support, -1 = unanimous rejection, 0 = dead heat.
  const voteMargin = total > 0 ? (forWeight - againstWeight) / total : 0;

  const negativeEvidence = evidence.filter((e) => e.voteCount < 0).length;
  const positiveEvidence = evidence.filter((e) => e.voteCount > 0).length;

  const reasons: string[] = [];
  if (Math.abs(voteMargin) <= CLOSE_MARGIN) {
    reasons.push("the vote is split");
  }
  if (negativeEvidence > positiveEvidence && negativeEvidence > 0) {
    reasons.push("the filed evidence leans against it");
  }

  return {
    contested: reasons.length > 0,
    reason: reasons.length > 0 ? `${reasons.join(", ")}` : "",
    voteMargin: Math.round(voteMargin * 100) / 100,
    negativeEvidence,
    positiveEvidence,
    voterCount,
  };
}
