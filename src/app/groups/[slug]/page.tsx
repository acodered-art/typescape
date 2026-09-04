import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/session";
import { Btn, InkTag, PageTitle, Section, SectionHead, Sheet, Typed } from "@/components/dossier";
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
  } catch {
    return null;
  }
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
  if (m < 60) return `${m} ${m === 1 ? "minute" : "minutes"} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ${h === 1 ? "hour" : "hours"} ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? "yesterday" : `${d} days ago`;
}

const count = (k: number, one: string, many = `${one}s`) => `${k} ${k === 1 ? one : many}`;

/** A group: members as typed handles, posts as notes with the reply count in the gutter, the join control on the desk. */
export default async function GroupPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [group, posts] = await Promise.all([getGroup(slug), getPosts(slug)]);
  if (!group) notFound();

  const session = await auth();
  const isMember = !!group.myMembership;
  const isAdmin = group.myMembership?.role === "admin" || group.creator.id === session?.user?.id;

  return (
    <div className="pb-10">
      <PageTitle
        title={group.name}
        aside={
          <>
            {CATEGORY_LABELS[group.category] || group.category}. Opened by{" "}
            <Link href={`/user/${group.creator.username}`} className="text-blue underline hover:text-paper">{group.creator.username}</Link>.{" "}
            {count(group.memberCount, "member")}, {count(group.postCount, "post")}.
          </>
        }
      >
        <GroupDetailClient slug={group.slug} isMember={isMember} isAdmin={isAdmin} />
      </PageTitle>

      <Sheet className="flex flex-col gap-[22px]">
        {group.description && <p className="max-w-[680px] text-[15px] leading-[1.55]">{group.description}</p>}

        <div className="flex flex-col gap-2">
          <span className="lab">Members</span>
          {group.members.length === 0 ? (
            <Typed>No members yet.</Typed>
          ) : (
            <Typed className="leading-[1.7]">
              {group.members.map((m, i) => (
                <span key={m.id}>
                  {i > 0 && ", "}
                  <Link href={`/user/${m.user.username}`} className="underline">{m.user.username}</Link>
                  {m.role !== "member" && <span className="text-steel-2"> ({m.role})</span>}
                </span>
              ))}
            </Typed>
          )}
        </div>

        <Section>
          <SectionHead title="Posts" aside={posts.length > 0 ? `${posts.length} on file` : "None yet"} />
          {isMember && (
            <div className="flex">
              <Btn href={`/groups/${group.slug}/post/new`} variant="small">+ New post</Btn>
            </div>
          )}
          {posts.length === 0 ? (
            <Typed className="text-[14px]">{isMember ? "No posts yet. File the first one." : "No posts yet in this group."}</Typed>
          ) : (
            <div className="flex flex-col">
              {posts.map((post, i) => (
                <div key={post.id} className={`grid grid-cols-[44px_minmax(0,1fr)] gap-[14px] pb-4 pt-[18px] ${i < posts.length - 1 ? "border-b border-paper-2" : ""}`}>
                  <div className="flex flex-col items-center text-navy">
                    <span className="font-typed text-[14px] font-bold">{post._count.replies}</span>
                    <span className="font-typed text-[9px] tracking-[0.1em]">{post._count.replies === 1 ? "REPLY" : "REPLIES"}</span>
                  </div>
                  <div className="flex min-w-0 flex-col gap-2">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <Link href={`/groups/${group.slug}/post/${post.id}`} className="font-display text-[22px] font-extrabold uppercase leading-none text-ink hover:text-navy">
                        {post.title}
                      </Link>
                      {post.pinOrder > 0 && <InkTag rotate={-2}>Pinned</InkTag>}
                    </div>
                    <div className="flex flex-wrap items-center gap-[10px] font-typed">
                      <Link href={`/user/${post.user.username}`} className="text-[14px] font-bold text-ink hover:text-blue">{post.user.username}</Link>
                      <span className="text-[12px] text-steel-2">{timeAgo(post.createdAt)}</span>
                    </div>
                    <p className="line-clamp-2 max-w-[620px] text-[15px] leading-[1.55]">{post.body}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      </Sheet>
    </div>
  );
}
