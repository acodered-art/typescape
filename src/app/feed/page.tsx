import { PageTitle } from "@/components/dossier";
import { StreaksAndChallenges } from "@/components/streaks/streaks-display";
import { ActivityFeed } from "@/components/feed/activity-feed";

/** The feed: what the readers you follow have filed, with your streak and the day's challenge beside it. */
export default function FeedPage() {
  return (
    <div className="pb-10">
      <PageTitle title="The feed" aside="What the readers you follow have filed." />
      <div className="grid gap-7 md:grid-cols-[minmax(0,1fr)_300px]">
        <ActivityFeed />
        <StreaksAndChallenges />
      </div>
    </div>
  );
}
