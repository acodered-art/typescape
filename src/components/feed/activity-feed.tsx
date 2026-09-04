"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { EmptySlot, Sheet, Typed } from "@/components/dossier";

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
  if (m < 60) return `${m} ${m === 1 ? "minute" : "minutes"} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ${h === 1 ? "hour" : "hours"} ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? "yesterday" : `${d} days ago`;
}

const VERBS: Record<string, string> = {
  created_profile: "opened a file",
  voted: "voted on a read",
  commented: "filed a note",
  typed: "added a read",
  created_typing: "added a read",
};

/** The file an activity points at, when its payload names one. */
function fileOf(data: unknown): { name: string; slug: string } | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const slug = (d.profileSlug ?? d.slug) as string | undefined;
  const name = (d.profileName ?? d.name) as string | undefined;
  return slug && name ? { name, slug } : null;
}

/** Rows on a sheet: the time, then a sentence with the typed handle and, when known, the file in display type. */
export function ActivityFeed() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedOut, setSignedOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/feed");
        if (cancelled) return;
        if (r.status === 401) setSignedOut(true);
        else if (r.ok) setActivities(await r.json());
      } catch {} finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <Sheet className="flex flex-col gap-4">
      {loading ? (
        <Typed>Opening the feed.</Typed>
      ) : signedOut ? (
        <EmptySlot>
          Sign in and follow a reader to fill this feed.{" "}
          <Link href="/auth/signin" className="underline">Sign in</Link>.
        </EmptySlot>
      ) : activities.length === 0 ? (
        <EmptySlot>Nothing on the record yet. Follow a reader to fill this feed.</EmptySlot>
      ) : (
        <div className="flex flex-col">
          {activities.map((a, i) => {
            const file = fileOf(a.data);
            return (
              <div key={a.id} className={`grid gap-1 py-3 md:grid-cols-[110px_minmax(0,1fr)] md:gap-4 ${i < activities.length - 1 ? "border-b border-paper-2" : ""}`}>
                <span className="font-typed text-[12px] text-steel-2">{timeAgo(a.createdAt)}</span>
                <p className="text-[15px] leading-[1.5]">
                  <Link href={`/user/${a.user.username}`} className="font-typed text-[14px] font-bold text-ink hover:text-blue">
                    {a.user.username}
                  </Link>{" "}
                  {VERBS[a.activityType] ?? a.activityType.replace(/_/g, " ")}
                  {file && (
                    <>
                      {" "}
                      <Link href={`/profiles/${file.slug}`} className="font-display text-[22px] font-extrabold uppercase leading-none text-ink hover:text-navy">
                        {file.name}
                      </Link>
                    </>
                  )}
                  .
                </p>
              </div>
            );
          })}
        </div>
      )}
    </Sheet>
  );
}
