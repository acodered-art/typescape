import type { Metadata } from "next";
import { PageTitle, Typed } from "@/components/dossier";
import { CompatibilityForm } from "@/components/compatibility-form";

export const metadata: Metadata = {
  title: "Compatibility — TypeScape",
  description:
    "Compare two personality readings and see where they align and where they diverge, based on the recorded cross-system correlations.",
  alternates: { canonical: "/compatibility" },
  openGraph: {
    title: "Compare two readings — TypeScape",
    description: "See where two personality types align and where they diverge.",
    type: "website",
    url: "/compatibility",
  },
};

export default function CompatibilityPage() {
  return (
    <div className="pb-10">
      <PageTitle title="Compatibility" aside="Two readings, one report." />
      <div className="max-w-[860px]">
        <Typed className="mb-4 block text-[14px] leading-[1.55]">
          Put two readings side by side. The report uses the recorded cross-system
          correlations, and says plainly when there is nothing concrete to compare rather than
          inventing a number.
        </Typed>
        <CompatibilityForm />
      </div>
    </div>
  );
}
