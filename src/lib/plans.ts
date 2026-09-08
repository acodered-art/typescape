/**
 * Plan definitions — the single source of truth for what each tier allows.
 *
 * The database `plans` table is seeded from this file so the code and the data
 * cannot drift: if a limit changes here, the seed script moves it there, and the
 * resolver below prefers the database only because an operator may need to
 * adjust a limit without a deploy.
 *
 * Pure and dependency-free so the gating logic is unit-testable.
 */

export type PlanSlug = "free" | "pro" | "business";

export interface Plan {
  slug: PlanSlug;
  name: string;
  /** Whole cents per month. */
  priceCents: number;
  /** API requests per rolling minute. */
  apiRateLimit: number;
  maxApiKeys: number;
  features: {
    /** Trait-vector similarity and the radar/diff views. */
    advancedVectors: boolean;
    /** No ads (for when ads exist). */
    adFree: boolean;
    /** Two-person compatibility reports. */
    compatibility: boolean;
    /** Bulk export of the corpus. */
    bulkExport: boolean;
  };
  blurb: string;
}

export const PLANS: Record<PlanSlug, Plan> = {
  free: {
    slug: "free",
    name: "Free",
    priceCents: 0,
    apiRateLimit: 60,
    maxApiKeys: 2,
    features: {
      advancedVectors: false,
      adFree: false,
      compatibility: true,
      bulkExport: false,
    },
    blurb: "Everything the community builds, read-only API, two keys.",
  },
  pro: {
    slug: "pro",
    name: "Pro",
    priceCents: 900,
    apiRateLimit: 600,
    maxApiKeys: 10,
    features: {
      advancedVectors: true,
      adFree: true,
      compatibility: true,
      bulkExport: true,
    },
    blurb: "Ten times the API rate limit, vector tools, and bulk export.",
  },
  business: {
    slug: "business",
    name: "Business",
    priceCents: 4900,
    apiRateLimit: 3000,
    maxApiKeys: 50,
    features: {
      advancedVectors: true,
      adFree: true,
      compatibility: true,
      bulkExport: true,
    },
    blurb: "Licensed use of the typed-profile dataset at scale.",
  },
};

export const PLAN_ORDER: PlanSlug[] = ["free", "pro", "business"];

export function isPlanSlug(value: string): value is PlanSlug {
  return value === "free" || value === "pro" || value === "business";
}

export function getPlan(slug: string | null | undefined): Plan {
  return isPlanSlug(slug ?? "") ? PLANS[slug as PlanSlug] : PLANS.free;
}

export function hasFeature(slug: string | null | undefined, feature: keyof Plan["features"]): boolean {
  return getPlan(slug).features[feature] === true;
}

/**
 * A subscription grants its plan only while it is active and inside its period.
 * Past-due and expired rows fall back to free, so a failed renewal degrades the
 * account rather than leaving paid access on indefinitely.
 */
export function effectivePlanSlug(
  subscription: { planSlug: string; status: string; currentPeriodEnd: Date } | null | undefined,
  fallback: string | null | undefined,
  now: Date = new Date()
): PlanSlug {
  if (subscription) {
    const active = subscription.status === "active" || subscription.status === "past_due";
    if (active && subscription.currentPeriodEnd > now && isPlanSlug(subscription.planSlug)) {
      return subscription.planSlug;
    }
    // An inactive or expired subscription means the account is on free.
    return "free";
  }
  return isPlanSlug(fallback ?? "") ? (fallback as PlanSlug) : "free";
}

/** Price as a display string, e.g. "$9/mo". */
export function formatPrice(cents: number): string {
  if (cents === 0) return "Free";
  const dollars = cents / 100;
  return `$${Number.isInteger(dollars) ? dollars : dollars.toFixed(2)}/mo`;
}
