import Link from "next/link";
import { auth } from "@/lib/session";
import { CreateGroupButton } from "./create-group-btn";

interface GroupData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  category: string;
  memberCount: number;
  postCount: number;
  createdAt: string;
  creator: { username: string };
}

const CATEGORY_LABELS: Record<string, string> = {
  fandom: "Fandom & Franchises",
  system: "Typing Systems",
  theory: "Theory & Debate",
  help: "Help & Requests",
};

const CATEGORY_COLORS: Record<string, string> = {
  fandom: "bg-[#2a3f6e]/20 text-[#8ab4f8] border-[#3a5f8e]",
  system: "bg-[#3a2a4e]/20 text-[#d4a0f8] border-[#5a3a7e]",
  theory: "bg-[#2a4a3e]/20 text-[#7ddfc0] border-[#3a6a5e]",
  help: "bg-[#6b5a2a]/20 text-[#f0d070] border-[#6b5a3a]",
};

async function getGroups() {
  const base = "http://localhost:3002";
  try {
    const res = await fetch(`${base}/api/groups`, { cache: "no-store" });
    if (res.ok) return res.json();
  } catch {}
  return [];
}

export default async function GroupsPage() {
  const groups = await getGroups() as GroupData[];
  const session = await auth();

  // Group by category
  const byCategory = new Map<string, GroupData[]>();
  for (const g of groups) {
    const cat = g.category || "fandom";
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(g);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#e8ecf4]">Community Groups</h1>
          <p className="text-sm text-[#7888a0] mt-1">
            Join groups to discuss typings, theories, and characters with the community.
          </p>
        </div>
        {session?.user && <CreateGroupButton />}
      </div>

      {groups.length === 0 ? (
        <div className="text-center py-12 text-[#4a5a70]">
          <p className="text-lg">No groups yet.</p>
          <p className="text-sm mt-1">Be the first to create one!</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Array.from(byCategory.entries()).map(([category, catGroups]) => (
            <section key={category}>
              <h2 className="text-sm font-semibold text-[#7888a0] uppercase tracking-wider mb-3">
                {CATEGORY_LABELS[category] || category}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {catGroups.map((g) => {
                  const colors = CATEGORY_COLORS[g.category] || "bg-[#1a2234]/20 text-[#7888a0]";
                  return (
                    <Link
                      key={g.id}
                      href={`/groups/${g.slug}`}
                      className="p-4 rounded-lg border border-[#1a2234] bg-[#0e1420] hover:border-[#2a3a4a] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold shrink-0 bg-[#141c2b] border border-[#1a2234]">
                          {g.icon || g.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-medium text-[#c8d0dc] truncate">{g.name}</h3>
                          {g.description && (
                            <p className="text-xs text-[#4a5a70] line-clamp-1 mt-0.5">{g.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-3 text-xs text-[#4a5a70]">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${colors}`}>
                          {CATEGORY_LABELS[g.category]?.split(" ")[0] || g.category}
                        </span>
                        <span>{g.memberCount} member{g.memberCount !== 1 ? "s" : ""}</span>
                        <span>{g.postCount} post{g.postCount !== 1 ? "s" : ""}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}