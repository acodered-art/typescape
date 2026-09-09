import type { Metadata } from "next";
import Link from "next/link";
import { Btn, PageTitle, SectionHead, Sheet, Typed } from "@/components/dossier";
import { PLANS, PLAN_ORDER, formatPrice, type Plan } from "@/lib/plans";

export const metadata: Metadata = {
  title: "Plans — TypeScape",
  description:
    "TypeScape is free to read and vote. Pro and Business add a higher API rate limit, vector tools, and bulk export.",
  alternates: { canonical: "/plans" },
};

/**
 * Price list. Limits come from `src/lib/plans.ts`, the same module the API
 * enforces against, so what is shown here is what a key actually gets.
 */

const FEATURE_LABELS: { key: keyof Plan["features"]; label: string; hint: string }[] = [
  { key: "compatibility", label: "Compatibility reports", hint: "Compare two readings" },
  { key: "advancedVectors", label: "Vector tools", hint: "Similarity, radar, trait diffs" },
  { key: "bulkExport", label: "Bulk export", hint: "Pull the corpus in one go" },
  { key: "adFree", label: "Ad-free", hint: "When ads arrive" },
];

export default function PlansPage() {
  return (
    <div className="pb-10">
      <PageTitle title="Plans" aside="Reading and voting are always free." />
      <div className="flex max-w-[1000px] flex-col gap-8">
        <Typed className="block max-w-[680px] text-lg leading-[1.6]">
          The database, the voting, and the community features are free and stay free. Paid
          plans exist for people building on the data — a higher API rate limit, the vector
          tooling, and bulk export.
        </Typed>

        <div className="grid gap-5 md:grid-cols-3">
          {PLAN_ORDER.map((slug) => {
            const p = PLANS[slug];
            const isFree = p.priceCents === 0;
            return (
              <Sheet key={slug} className="flex flex-col gap-3 p-5">
                <div>
                  <div className="font-display text-9xl font-extrabold uppercase leading-none">
                    {p.name}
                  </div>
                  <div className="mt-1 font-typed text-6xl text-blue">
                    {formatPrice(p.priceCents)}
                  </div>
                </div>
                <Typed className="text-base leading-[1.5]">{p.blurb}</Typed>

                <div className="border-t border-steel pt-3">
                  <div className="lab mb-2">Limits</div>
                  <dl className="flex flex-col gap-1 text-base">
                    <div className="flex justify-between gap-2">
                      <dt>API requests / min</dt>
                      <dd className="font-typed">{p.apiRateLimit.toLocaleString()}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt>API keys</dt>
                      <dd className="font-typed">{p.maxApiKeys}</dd>
                    </div>
                  </dl>
                </div>

                <div className="border-t border-steel pt-3">
                  <div className="lab mb-2">Includes</div>
                  <ul className="flex flex-col gap-1 text-base">
                    {FEATURE_LABELS.map((f) => {
                      const on = p.features[f.key];
                      return (
                        <li key={f.key} className="flex items-baseline gap-2">
                          <span className={`font-typed text-sm ${on ? "text-blue" : "text-steel-2"}`}>
                            {on ? "+" : "−"}
                          </span>
                          <span className={on ? "" : "text-steel-2"} title={f.hint}>
                            {f.label}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div className="mt-auto pt-2">
                  {isFree ? (
                    <Btn href="/auth/signin">Start free</Btn>
                  ) : (
                    <Btn href="/settings#api" variant="primary">
                      Enable on your account
                    </Btn>
                  )}
                </div>
              </Sheet>
            );
          })}
        </div>

        <Sheet className="flex flex-col gap-2 p-5">
          <SectionHead title="How limits are enforced" size={20} />
          <Typed className="text-base leading-[1.6]">
            A key&apos;s rate limit is the lower of its own override and its owner&apos;s plan
            ceiling, so a paid plan raises the cap but a per-key setting can still hold one
            integration back. If a subscription lapses, the account falls back to the free
            limits rather than keeping paid access indefinitely.
          </Typed>
          <Typed className="text-base leading-[1.6]">
            Building something?{" "}
            <Link href="/settings#api" className="text-blue underline">
              Create a key
            </Link>{" "}
            or read the{" "}
            <Link href="/embed" className="text-blue underline">
              embed docs
            </Link>
            .
          </Typed>
        </Sheet>
      </div>
    </div>
  );
}
