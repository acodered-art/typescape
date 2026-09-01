import Link from "next/link";
import { ProfileCard } from "@/components/profile-card";

interface HomeData {
  stats: { profiles: number; typings: number; votes: number; users: number; comments: number };
  trending: { name: string; slug: string; viewCount: number }[];
  recent: { name: string; slug: string; imageUrl: string | null; description: string | null; category: { name: string; slug: string } | null; typings: { typingSystem: { name: string; slug: string }; typeValue: string; confidence: number }[] }[];
  categories: { name: string; slug: string; description: string | null; _count: { profiles: number }; children: { name: string; slug: string; _count: { profiles: number } }[] }[];
}

async function getHomeData(): Promise<HomeData> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  const [statsRes, recentRes, categoriesRes] = await Promise.all([
    fetch(`${base}/api/stats`, { cache: "no-store" }).catch(() => null),
    fetch(`${base}/api/profiles?limit=12`, { cache: "no-store" }).catch(() => null),
    fetch(`${base}/api/categories`, { cache: "no-store" }).catch(() => null),
  ]);

  const stats = statsRes ? await statsRes.json() : { profiles: 0, typings: 0, votes: 0, users: 0, comments: 0 };
  const recentData = recentRes ? await recentRes.json() : { profiles: [] };
  const categories = categoriesRes ? await categoriesRes.json() : [];

  return {
    stats,
    trending: stats.trending || [],
    recent: recentData.profiles || [],
    categories,
  };
}

export default async function HomePage() {
  const data = await getHomeData();

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="text-center py-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-[#e8ecf4] mb-2">
          TypeScape
        </h1>
        <p className="text-[#7888a0] max-w-lg mx-auto">
          Community-driven personality database for characters, celebrities, and archetypes.
          Rate, debate, and discover across MBTI, Enneagram, Big Five, and more.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-3 text-center text-xs">
        {[
          { label: "Profiles", value: data.stats.profiles },
          { label: "Typings", value: data.stats.typings },
          { label: "Votes", value: data.stats.votes },
          { label: "Users", value: data.stats.users },
          { label: "Comments", value: data.stats.comments },
        ].map((s) => (
          <div key={s.label} className="p-3 rounded border border-[#1a2234] bg-[#0e1420]">
            <div className="text-lg font-bold text-[#64ffda]">{s.value.toLocaleString()}</div>
            <div className="text-[#4a5a70] mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Categories */}
      {data.categories.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-[#e8ecf4] mb-3">Categories</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {data.categories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/categories/${cat.slug}`}
                className="p-3 rounded border border-[#1a2234] bg-[#0e1420] hover:border-[#2a3a4a] transition-colors"
              >
                <div className="font-medium text-sm text-[#c8d0dc]">{cat.name}</div>
                <div className="text-xs text-[#4a5a70] mt-1">{cat._count.profiles} profiles</div>
                {cat.children.length > 0 && (
                  <div className="text-xs text-[#4a5a70] mt-0.5">
                    {cat.children.slice(0, 3).map((c) => c.name).join(", ")}
                  </div>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Recent */}
      {data.recent.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-[#e8ecf4]">Recent Profiles</h2>
            <Link href="/search" className="text-xs text-[#64ffda] hover:underline">
              View all
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.recent.map((p) => (
              <ProfileCard
                key={p.slug}
                name={p.name}
                slug={p.slug}
                imageUrl={p.imageUrl}
                description={p.description}
                category={p.category}
                typings={p.typings}
              />
            ))}
          </div>
        </section>
      )}

      {/* Trending */}
      {data.trending.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-[#e8ecf4] mb-3">Trending</h2>
          <div className="flex flex-wrap gap-2">
            {data.trending.map((p) => (
              <Link
                key={p.slug}
                href={`/profiles/${p.slug}`}
                className="px-3 py-1.5 rounded-full border border-[#1a2234] bg-[#0e1420] text-sm hover:border-[#64ffda]/40 transition-colors"
              >
                {p.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="text-center text-xs text-[#4a5a70] pt-8 pb-4 border-t border-[#1a2234]">
        TypeScape — a community personality database. Not affiliated with any psychological organization.
      </footer>
    </div>
  );
}