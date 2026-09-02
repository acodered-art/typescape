"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface ActivityItem {
  id: string;
  activityType: string;
  data: unknown;
  createdAt: string;
  user: { username: string; avatarUrl: string | null };
}

function timeAgo(dateStr: string): string {
  const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function ActivityFeed() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/feed")
      .then((r) => { if (r.ok) r.json().then(setActivities); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-[#4a5a70]">Loading feed...</p>;

  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-[#4a5a70]">
        <p className="text-sm">No activity yet.</p>
        <p className="text-xs mt-1">Follow users to see their activity here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {activities.map((a) => (
        <div key={a.id} className="flex items-center gap-2 px-3 py-2 rounded bg-[#0e1420] border border-[#1a2234] text-sm">
          <Link href={`/user/${a.user.username}`} className="font-medium text-[#64ffda] hover:underline text-xs">
            {a.user.username}
          </Link>
          <span className="text-[#7888a0] text-xs">
            {a.activityType === "created_profile" ? "created a profile" :
             a.activityType === "voted" ? "voted on a typing" :
             a.activityType === "commented" ? "commented" :
             a.activityType}
          </span>
          <span className="ml-auto text-[10px] text-[#4a5a70]">{timeAgo(a.createdAt)}</span>
        </div>
      ))}
    </div>
  );
}