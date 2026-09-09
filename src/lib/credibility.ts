/**
 * Credibility: how often a reader's votes land with the eventual consensus.
 *
 * This is the anti-PDB differentiator. Everywhere else, a vote is a vote and
 * seniority is just an account age. Here a reader earns weight by being right
 * often enough that the community converges on their side — a track record,
 * not a reputation grind.
 *
 * Method, per vote:
 *   1. Recompute the consensus on that typing **excluding** the voter, so a
 *      reader cannot inflate their own agreement by voting with themselves.
 *   2. Compare their vote to it: right if they were on the majority side.
 *   3. Ignore tyings where the remaining votes are an exact tie (no signal) or
 *      where fewer than `minPeers` other readers voted (nothing to agree with).
 *
 * Output is a percentage plus the sample size, because a 100% score from one
 * vote is noise and the UI must be able to say so.
 */

export interface CredibilityVote {
  typingId: string;
  voteValue: number;
  weight: number;
}

export interface Credibility {
  /** 0-100, or null when there is nothing to measure. */
  score: number | null;
  /** Votes that could be judged (excluded: ties and thin samples). */
  sample: number;
  /** Votes that matched the peer consensus. */
  agreed: number;
  totalVotes: number;
  /** Too few judgeable votes to be meaningful. */
  provisional: boolean;
}

const MIN_PEERS = 3;
const PROVISIONAL_BELOW = 10;

/** True when `voteValue` sits on the majority side of `peerWeight`. */
function agrees(peerWeight: number, voteValue: number): boolean | null {
  if (peerWeight === 0) return null; // exact tie: no side to be on
  return voteValue > 0 ? peerWeight > 0 : peerWeight < 0;
}

/**
 * @param mine   the reader's votes (one per typing)
 * @param peers  every other vote, grouped by typing id
 */
export function calcCredibility(
  mine: CredibilityVote[],
  peers: Map<string, CredibilityVote[]>
): Credibility {
  let sample = 0;
  let agreed = 0;

  for (const myVote of mine) {
    const others = peers.get(myVote.typingId) ?? [];
    if (others.length < MIN_PEERS) continue;

    const peerWeight = others.reduce((sum, v) => sum + v.voteValue * v.weight, 0);
    const verdict = agrees(peerWeight, myVote.voteValue);
    if (verdict === null) continue;

    sample++;
    if (verdict) agreed++;
  }

  return {
    score: sample > 0 ? Math.round((agreed / sample) * 100) : null,
    sample,
    agreed,
    totalVotes: mine.length,
    provisional: sample < PROVISIONAL_BELOW,
  };
}
