import { notFound } from "next/navigation";
import Link from "next/link";
import { TypingBadge } from "@/components/typing-badge";

interface UserData {
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  reputation: number;
  role: string;
  createdAt: string;
  _count: { profiles: number; typings: number; votes: number; comments: number; collections: number };
  typings: {
    typeValue: string;
    typingSystem: { name: string; slug: string };
    profile: { name: string; slug: string };
    createdAt: string;
  }[];
  collections: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    _count: { items: number };
  }[];
}

interface AchievementData {
  id: string;
  earnedAt: string;
  achievement: {
    slug: string;
    name: string;
    description: string;
    icon: string;
  };
}

async function getUser(username: string): Promise<{ user: UserData | null; achievements: AchievementData[] }> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  try {
    const [userRes, achRes] = await Promise.all([
      fetch(`${base}/api/user/${username}`, { cache: "no-store" }),
      fetch(`${base}/api/user/${username}/achievements`, { cache: "no-store" }),
    ]);
    const user = userRes.ok ? await userRes.json() : null;
    const achievements = achRes.ok ? await achRes.json() : [];
    return { user, achievements };
  } catch {
    return { user: null, achievements: [] };
  }
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export default async function UserPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const { user, achievements } = await getUser(username);

  if (!user) notFound();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex gap-4 items-start">
        {user.avatarUrl ? (
          <div className="w-16 h-16 rounded-full overflow-hidden shrink-0 bg-[#1a2234]">
            <img src={user.avatarUrl} alt={user.username} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-16 h-16 rounded-full shrink-0 bg-[#1a2234] flex items-center justify-center text-2xl font-bold text-[#64ffda]">
            {user.username.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <h1 className="text-xl font-bold text-[#e8ecf4]">
            {user.username}
            {user.role !== "user" && (
              <span className="ml-2 text-xs text-[#64ffda] uppercase">{user.role}</span>
            )}
          </h1>
          {user.bio && <p className="text-sm text-[#7888a0] mt-1">{user.bio}</p>}
          <p className="text-xs text-[#4a5a70] mt-1">Joined {timeAgo(user.createdAt)}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-3 text-center text-xs">
        {[
          { label: "Reputation", value: user.reputation },
          { label: "Profiles", value: user._count.profiles },
          { label: "Typings", value: user._count.typings },
          { label: "Votes", value: user._count.votes },
          { label: "Comments", value: user._count.comments },
        ].map((s) => (
          <div key={s.label} className="p-3 rounded border border-[#1a2234] bg-[#0e1420]">
            <div className="text-lg font-bold text-[#64ffda]">{s.value.toLocaleString()}</div>
            <div className="text-[#4a5a70] mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Achievements */}
      {achievements.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-[#7888a0] uppercase tracking-wider mb-2">
            Achievements ({achievements.length})
          </h2>
          <div className="flex flex-wrap gap-2">
            {achievements.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#1a2234] bg-[#0e1420]"
                title={a.achievement.description}
              >
                <span className="text-base">{a.achievement.icon}</span>
                <span className="text-xs text-[#c8d0dc]">{a.achievement.name}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Collections */}
      {user.collections.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-[#7888a0] uppercase tracking-wider mb-2">
            Collections ({user._count.collections})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {user.collections.map((c) => (
              <Link
                key={c.id}
                href={`/collections/${c.slug}`}
                className="p-3 rounded border border-[#1a2234] bg-[#0e1420] hover:border-[#2a3a4a] transition-colors"
              >
                <div className="font-medium text-sm text-[#c8d0dc]">{c.name}</div>
                <div className="text-xs text-[#4a5a70] mt-1">{c._count.items} profiles</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Typing History */}
      {user.typings.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-[#7888a0] uppercase tracking-wider mb-2">
            Recent Typings
          </h2>
          <div className="space-y-1">
            {user.typings.map((t) => (
              <Link
                key={t.profile.slug + t.typingSystem.slug + t.typeValue + t.createdAt}
                href={`/profiles/${t.profile.slug}`}
                className="flex items-center gap-2 px-3 py-1.5 rounded bg-[#0e1420] border border-[#1a2234] text-sm hover:border-[#2a3a4a] transition-colors"
              >
                <span className="text-[#c8d0dc]">{t.profile.name}</span>
                <span className="text-[#4a5a70]">→</span>
                <TypingBadge
                  systemSlug={t.typingSystem.slug}
                  systemName={t.typingSystem.name}
                  typeValue={t.typeValue}
                  confidence={0}
                />
                <span className="ml-auto text-xs text-[#4a5a70]">{timeAgo(t.createdAt)}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {user.typings.length === 0 && user.collections.length === 0 && (
        <p className="text-sm text-[#4a5a70] italic">
          No activity yet. This user hasn't submitted any typings or created collections.
        </p>
      )}
    </div>
  );
}