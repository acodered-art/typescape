import type { Metadata } from "next";
import { PageTitle, Typed } from "@/components/dossier";
import { MatchForm } from "./match-form";

export const metadata: Metadata = {
  title: "Which character are you? — TypeScape",
  description:
    "Enter your MBTI and Enneagram type and find the fictional characters and celebrities the community types the same way.",
  alternates: { canonical: "/match" },
  openGraph: {
    title: "Which character are you?",
    description: "Match your MBTI and Enneagram reading against the community's character files.",
    type: "website",
    url: "/match",
  },
};

export default function MatchPage() {
  return (
    <div className="pb-10">
      <PageTitle title="Which character are you?" aside="No account needed." />
      <div className="max-w-[860px]">
        <Typed className="mb-4 block text-[14px] leading-[1.55]">
          Pick the reading that fits you and we rank every file in the database by how many of
          your types it shares. Nothing is stored and you do not need to sign in.
        </Typed>
        <MatchForm />
      </div>
    </div>
  );
}
