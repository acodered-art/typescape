import { PageTitle, SectionHead } from "@/components/dossier";
import { CorrelationExplorer } from "@/components/correlation-explorer";
import CompareForm from "./compare-form";

/**
 * Cross-reference: the correlation map across systems, then the two-read
 * comparison. ?system1=&type1=&system2=&type2= pre-fills and runs the comparison.
 */
export default async function ComparePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const pick = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : Array.isArray(sp[k]) ? (sp[k] as string[])[0] : "") || "";
  return (
    <div className="flex flex-col gap-8 pb-10">
      <div>
        <PageTitle title="Cross-reference" aside="Two reads, and every file that carries both." />
        <CompareForm initial={{ system1: pick("system1") || "mbti", type1: pick("type1"), system2: pick("system2") || "mbti", type2: pick("type2") }} />
      </div>
      <div>
        <SectionHead title="How the systems line up" aside="Click a type to trace its links" />
        <CorrelationExplorer />
      </div>
    </div>
  );
}
