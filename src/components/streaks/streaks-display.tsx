"use client";
import { useCallback, useEffect, useState } from "react";

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

export function StreaksAndChallenges() {
  const [streaks, setStreaks] = useState<StreakData[]>([]);
  const [challenge, setChallenge] = useState<ChallengeData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [sRes, cRes] = await Promise.all([
        fetch("/api/streaks"),
        fetch("/api/daily-challenge"),
      ]);
      if (sRes.ok) setStreaks(await sRes.json());
      if (cRes.ok) {
        const data = await cRes.json();
        if (data && data.challenge) setChallenge(data);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const loginStreak = streaks.find((s) => s.streakType === "daily_login");

  if (loading) return null;

  return (
    <div className="space-y-3">
      {/* Streak Display */}
      {loginStreak && (
        <div className="p-3 rounded border border-[#1a2234] bg-[#0e1420]">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#7888a0] uppercase tracking-wider">Login Streak</span>
            <div className="flex items-center gap-1">
              <span className="text-lg font-bold text-[#64ffda]">{loginStreak.count}</span>
              <span className="text-xs text-[#4a5a70]">days</span>
            </div>
          </div>
        </div>
      )}

      {/* Daily Challenge */}
      {challenge && (
        <div className="p-3 rounded border border-[#1a2234] bg-[#0e1420]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#7888a0] uppercase tracking-wider">Daily Challenge</span>
            {challenge.completed && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-[#64ffda]/20 text-[#64ffda]">Done!</span>
            )}
          </div>
          <h3 className="text-sm font-medium text-[#c8d0dc]">{challenge.challenge.title}</h3>
          <p className="text-xs text-[#7888a0] mt-0.5">{challenge.challenge.description}</p>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-[#1a2234] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#64ffda] rounded-full transition-all"
                style={{ width: `${Math.min(100, (challenge.progress / challenge.target) * 100)}%` }}
              />
            </div>
            <span className="text-xs text-[#4a5a70]">{challenge.progress}/{challenge.target}</span>
          </div>
          <div className="mt-1 text-[10px] text-[#4a5a70]">Reward: {challenge.challenge.reward} rep</div>
        </div>
      )}
    </div>
  );
}