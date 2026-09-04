"use client";
import { useEffect, useState } from "react";
import { InkTag, NavyCard } from "@/components/dossier";

interface StreakData {
  streakType: string;
  count: number;
  lastDate: string;
}

interface ChallengeData {
  challenge: { id: string; title: string; description: string; reward: number };
  progress: number;
  target: number;
  completed: boolean;
}

/**
 * The reader's login streak and the day's challenge as navy cards on the desk.
 * Signed out (or nothing on file) it prompts to sign in, unless `quiet`, when it renders nothing.
 */
export function StreaksAndChallenges({ quiet = false }: { quiet?: boolean }) {
  const [streaks, setStreaks] = useState<StreakData[]>([]);
  const [challenge, setChallenge] = useState<ChallengeData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [sRes, cRes] = await Promise.all([fetch("/api/streaks"), fetch("/api/daily-challenge")]);
        if (cancelled) return;
        if (sRes.ok) setStreaks(await sRes.json());
        if (cRes.ok) {
          const data = await cRes.json();
          if (data && data.challenge) setChallenge(data);
        }
      } catch {} finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const loginStreak = streaks.find((s) => s.streakType === "daily_login");

  if (loading) return null;

  if (!loginStreak && !challenge) {
    if (quiet) return null;
    return <NavyCard title="Streaks and challenges">Sign in to keep a login streak and take the daily challenge.</NavyCard>;
  }

  return (
    <div className="flex flex-col gap-3">
      {loginStreak && (
        <NavyCard title="Login streak">
          <span className="block py-1 font-typed text-[28px] font-bold leading-none text-paper">{loginStreak.count}</span>
          {loginStreak.count === 1 ? "day" : "days"} in a row.
        </NavyCard>
      )}
      {challenge && (
        <NavyCard title="Daily challenge">
          <span className="block text-[14px] text-paper">{challenge.challenge.title}</span>
          {challenge.challenge.description}
          <span className="mt-2 block h-1 w-full bg-paper/20" aria-hidden="true">
            <span className="block h-1 bg-blue" style={{ width: `${Math.min(100, (challenge.progress / challenge.target) * 100)}%` }} />
          </span>
          <span className="mt-1 block">
            {challenge.progress} of {challenge.target}. Reward {challenge.challenge.reward} reputation.
          </span>
          {challenge.completed && <InkTag className="mt-2">Done</InkTag>}
        </NavyCard>
      )}
    </div>
  );
}
