import type { Metadata } from "next";
import { PageTitle, Typed } from "@/components/dossier";
import { DailyCard } from "@/components/daily-card";

export const metadata: Metadata = {
  title: "Today's character — TypeScape",
  description:
    "One character a day, the same for everyone. Open the file, weigh the reading, and move on.",
  alternates: { canonical: "/daily" },
  openGraph: {
    title: "Today's character",
    description: "One character a day, chosen from the community's files.",
    type: "website",
    url: "/daily",
  },
};

export default function DailyPage() {
  return (
    <div className="pb-10">
      <PageTitle title="Today's character" aside="One file a day." />
      <div className="max-w-[720px]">
        <Typed className="mb-4 block text-md leading-[1.55]">
          The same character for every reader until midnight UTC. Open the file, check whether
          the community&apos;s reading holds up, and move on — thirty seconds, once a day.
        </Typed>
        <DailyCard />
      </div>
    </div>
  );
}
