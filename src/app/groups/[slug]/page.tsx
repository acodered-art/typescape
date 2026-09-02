import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/session";
import { GroupDetailClient } from "./group-detail-client";

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
  creator: { id: string; username: string; avatarUrl: string | null };
  members: { id: string; role: string; user: { id: string; username: string; avatarUrl: string | null; reputation: number } }[];
  myMembership: { id: string; role: string } | null;
}

interface PostData {
  id: string;
  title: string;
  body: string;
  pinOrder: number;
  replyCount: number;
  createdAt: string;
  user: { id: string; username: string; avatarUrl: string | null; reputation: number };
  _count: { replies: number };
}

const CATEGORY_LABELS: Record<string, string> = {
  fandom: "Fandom & Franchises",
  system: "Typing Systems",
  theory: "Theory & Debate",
  help: "Help & Requests",
};

async function getGroup(slug: string): Promise<GroupData | null> {
  const base = "http://localhost:3002";
  try {
    const res = await fetch(`${base}/api/groups/${slug}`, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

async function getPosts(slug: string): Promise<PostData[]> {
  const base = "http://localhost:3002";
  try {
    const res = await fetch(`${base}/api/groups/${slug}/posts`, { cache: "no-store" });
    if (res.ok) return res.json();
  } catch {}
  return [];
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

export default async function GroupPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [group, posts] = await Promise.all([getGroup(slug), getPosts(slug)]);
  if (!group) notFound();

  const session = await auth();
  const isMember = !!group.myMembership;
  const isAdmin = group.myMembership?.role === "admin" || group.creator.id === session?.user?.id;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex gap-4 items-start">
        <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-bold shrink-0 bg-[#141c2b] border border-[#1a2234]">
          {group.icon || group.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[#e8ecf4]">{group.name}</h1>
            <span className="text-xs px-1.5 py-0.5 rounded bg-[#1a2234] text-[#4a5a70]">
              {CATEGORY_LABELS[group.category] || group.category}
            </span>
          </div>
          {group.description && (
            <p className="text-sm text-[#7888a0] mt-1">{group.description}</p>
          )}
          <div className="flex items-center gap-3 text-xs text-[#4a5a70] mt-1">
            <span>by <Link href={`/user/${group.creator.username}`} className="text-[#64ffda] hover:underline">{group.creator.username}</Link></span>
            <span>{group.memberCount} member{group.memberCount !== 1 ? "s" : ""}</span>
            <span>{group.postCount} post{group.postCount !== 1 ? "s" : ""}</span>
          </div>
        </div>
        <GroupDetailClient slug={group.slug} isMember={isMember} isAdmin={isAdmin} />
      </div>

      {/* Members */}
      <details className="text-sm">
        <summary className="text-xs text-[#7888a0] cursor-pointer hover:text-[#c8d0dc]">
          Members ({group.members.length})
        </summary>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {group.members.map((m) => (
            <Link
              key={m.id}
              href={`/user/${m.user.username}`}
              className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#141c2b] border border-[#1a2234] text-xs hover:border-[#2a3a4a] transition-colors"
            >
              <span className="text-[#c8d0dc]">{m.user.username}</span>
              {m.role !== "member" && (
                <span className="text-[10px] text-[#64ffda]">{m.role}</span>
              )}
            </Link>
          ))}
        </div>
      </details>

      {/* Posts */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[#7888a0] uppercase tracking-wider">Posts</h2>
          {isMember && (
            <Link
              href={`/groups/${group.slug}/post/new`}
              className="text-xs px-2 py-1 rounded bg-[#64ffda]/10 text-[#64ffda] border border-[#64ffda]/20 hover:bg-[#64ffda]/20"
            >
              + New Post
            </Link>
          )}
        </div>

        {posts.length === 0 ? (
          <p className="text-sm text-[#4a5a70] italic">
            {isMember ? "No posts yet. Start the discussion!" : "No posts yet in this group."}
          </p>
        ) : (
          <div className="space-y-2">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/groups/${group.slug}/post/${post.id}`}
                className="block p-4 rounded-lg border border-[#1a2234] bg-[#0e1420] hover:border-[#2a3a4a] transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-medium text-[#c8d0dc]">
                      {post.pinOrder > 0 && <span className="text-[#64ffda] mr-1">📌</span>}
                      {post.title}
                    </h3>
                    <p className="text-xs text-[#7888a0] mt-1 line-clamp-2">{post.body}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-[#4a5a70] mt-2">
                  <span className="text-[#64ffda]">{post.user.username}</span>
                  <span>{timeAgo(post.createdAt)}</span>
                  <span>{post._count.replies} repl{post._count.replies !== 1 ? "ies" : "y"}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}