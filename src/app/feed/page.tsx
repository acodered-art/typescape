import { StreaksAndChallenges } from "@/components/streaks/streaks-display";
import { ActivityFeed } from "@/components/feed/activity-feed";

export default function FeedPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-[#e8ecf4]">Activity Feed</h1>
      <p className="text-sm text-[#7888a0] -mt-4">
        Follow users to see their typing activity, votes, and comments here.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <ActivityFeed />
        </div>
        <div>
          <StreaksAndChallenges />
        </div>
      </div>
    </div>
  );
}