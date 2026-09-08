import { NextResponse } from "next/server";
import { PLANS, PLAN_ORDER, formatPrice } from "@/lib/plans";

/**
 * GET /api/plans — the public price list.
 *
 * Read from `src/lib/plans.ts` rather than the `plans` table so the marketing
 * page cannot drift from the code that enforces the limits. The table exists for
 * operator overrides at runtime, not as the display source.
 */
export async function GET() {
  return NextResponse.json({
    plans: PLAN_ORDER.map((slug) => {
      const p = PLANS[slug];
      return {
        slug: p.slug,
        name: p.name,
        price: formatPrice(p.priceCents),
        priceCents: p.priceCents,
        blurb: p.blurb,
        apiRateLimit: p.apiRateLimit,
        maxApiKeys: p.maxApiKeys,
        features: p.features,
      };
    }),
  });
}
