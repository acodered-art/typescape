/**
 * Compatibility between two readings.
 *
 * Two people each supply a type. This does not pretend to be science: it makes
 * the *known* correlations and the shared-vs-divergent structure explicit so two
 * readers can see where they align and where they will rub.
 *
 * Scored on three signals:
 *   1. Same type in the same system → 100 (trivially aligned).
 *   2. A recorded correlation between the two (either direction) → its strength.
 *   3. Different systems with no recorded link → 0, stated honestly.
 *
 * Pure and side-effect free so it can be unit-tested.
 */

// Relative import (not the "@/lib" alias) so the Node test runner, which
// does not resolve tsconfig paths, can import this module directly.
import { getCorrelations, type Correlation } from "./correlations.ts";

export interface Reading {
  system: string;
  type: string;
}

export interface Compatibility {
  /** 0-100. Null when the two readings cannot be compared. */
  score: number | null;
  /** How the score was reached, for the UI to explain itself. */
  basis: "same-type" | "correlated" | "unrelated" | "incomparable";
  /** The correlation that produced the score, when there was one. */
  link: Correlation | null;
  /** Human summary. */
  summary: string;
  /** Concrete alignments to show as bullets. */
  agreements: string[];
  /** Concrete divergences to show as bullets. */
  divergences: string[];
}

const label = (r: Reading, names: Record<string, string>) =>
  `${names[r.system] ?? r.system} ${r.type}`;

function correlationBetween(a: Reading, b: Reading): Correlation | null {
  // Either direction counts; prefer the stronger of the two.
  const forward = getCorrelations(a.system, a.type).filter(
    (c) => c.targetSystem === b.system && c.targetType === b.type
  );
  const reverse = getCorrelations(b.system, b.type).filter(
    (c) => c.targetSystem === a.system && c.targetType === a.type
  );
  const all = [...forward, ...reverse];
  if (all.length === 0) return null;
  return all.sort((x, y) => y.strength - x.strength)[0];
}

export function calcCompatibility(
  a: Reading,
  b: Reading,
  names: Record<string, string> = {}
): Compatibility {
  if (!a?.system || !a.type || !b?.system || !b.type) {
    return {
      score: null,
      basis: "incomparable",
      link: null,
      summary: "Two readings are needed to compare.",
      agreements: [],
      divergences: [],
    };
  }

  const agreements: string[] = [];
  const divergences: string[] = [];

  // Same system, same type: the strongest possible agreement.
  if (a.system === b.system && a.type.toLowerCase() === b.type.toLowerCase()) {
    agreements.push(`Both read as ${label(a, names)}.`);
    return {
      score: 100,
      basis: "same-type",
      link: null,
      summary: `Both read as ${label(a, names)} — an exact match.`,
      agreements,
      divergences,
    };
  }

  if (a.system === b.system) {
    divergences.push(
      `Different ${names[a.system] ?? a.system} types: ${a.type} and ${b.type}.`
    );
  } else {
    const link = correlationBetween(a, b);
    if (link) {
      const pct = Math.round(link.strength * 100);
      agreements.push(`${label(a, names)} and ${label(b, names)} are commonly linked (${pct}%).`);
      if (link.description) agreements.push(link.description + ".");
      return {
        score: pct,
        basis: "correlated",
        link,
        summary: `These two types commonly co-occur in ${pct}% of cases.`,
        agreements,
        divergences,
      };
    }

    divergences.push(
      `No recorded correlation between ${names[a.system] ?? a.system} and ${names[b.system] ?? b.system}.`
    );
    return {
      score: null,
      basis: "unrelated",
      link: null,
      summary:
        "These two systems have no recorded link, so there is nothing concrete to compare.",
      agreements,
      divergences,
    };
  }

  return {
    score: null,
    basis: "incomparable",
    link: null,
    summary: "These readings cannot be compared directly.",
    agreements,
    divergences,
  };
}
