import { PageTitle } from "@/components/dossier";
import CompareForm from "./compare-form";

/** Cross-reference: two reads, and every file that carries both. ?system1=&type1=&system2=&type2= pre-fills and runs the comparison. */
export default async function ComparePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const pick = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : Array.isArray(sp[k]) ? (sp[k] as string[])[0] : "") || "";
  return (
    <div className="pb-10">
      <PageTitle title="Cross-reference" aside="Two reads, and every file that carries both." />
      <CompareForm initial={{ system1: pick("system1") || "mbti", type1: pick("type1"), system2: pick("system2") || "mbti", type2: pick("type2") }} />
    </div>
  );
}
