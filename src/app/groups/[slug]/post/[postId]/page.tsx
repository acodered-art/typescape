"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Btn, PageTitle, Section, SectionHead, Sheet, Typed } from "@/components/dossier";
import { FormNote } from "@/components/dossier/modal";
import { useReaderHandle } from "@/components/dossier/reader";

interface PostUser {
  id: string;
  username: string;
  avatarUrl: string | null;
  reputation: number;
}

interface Reply {
  id: string;
  body: string;
  createdAt: string;
  user: PostUser;
}

interface PostDetail {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  user: PostUser;
  replies: Reply[];
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

/** One post on paper with its replies as notes and the composer under them. */
export default function PostPage({ params }: { params: Promise<{ slug: string; postId: string }> }) {
  const { slug, postId } = use(params);
  const me = useReaderHandle();
  const [post, setPost] = useState<PostDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/groups/${slug}/posts/${postId}`);
        if (!cancelled && res.ok) setPost(await res.json());
      } catch {} finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [slug, postId]);

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    setSubmitting(true);
    setNote("");
    try {
      const res = await fetch(`/api/groups/${slug}/posts/${postId}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: replyText.trim() }),
      });
      if (res.ok) {
        setReplyText("");
        const refetch = await fetch(`/api/groups/${slug}/posts/${postId}`);
        if (refetch.ok) setPost(await refetch.json());
      } else {
        const data = await res.json();
        setNote(res.status === 401 ? "Sign in to reply." : res.status === 403 ? "Join the group to reply." : data.error || "That reply did not go through.");
      }
    } catch {
      setNote("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="pb-10">
        <PageTitle title="Post" />
        <Sheet><Typed>Opening the post.</Typed></Sheet>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="pb-10">
        <PageTitle title="Post" />
        <div className="max-w-[560px]">
          <Sheet className="flex flex-col gap-3">
            <div className="font-display text-[48px] font-extrabold uppercase leading-none">No such post.</div>
            <Typed className="text-[14px]">
              <Link href={`/groups/${slug}`} className="underline">Back to the group</Link>.
            </Typed>
          </Sheet>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-10">
      <PageTitle
        title={post.title}
        aside={
          <>
            Filed by <Link href={`/user/${post.user.username}`} className="text-blue underline hover:text-paper">{post.user.username}</Link>, {timeAgo(post.createdAt)}.{" "}
            <Link href={`/groups/${slug}`} className="text-blue underline hover:text-paper">Back to the group</Link>.
          </>
        }
      />
      <div className="max-w-[860px]">
        <Sheet className="flex flex-col gap-[22px]">
          <p className="max-w-[680px] whitespace-pre-wrap text-[15px] leading-[1.6]">{post.body}</p>

          <Section>
            <SectionHead title="Replies" aside={post.replies.length > 0 ? `${post.replies.length} on file` : "None yet"} />
            {post.replies.length === 0 ? (
              <Typed className="text-[14px]">No replies yet. File the first one.</Typed>
            ) : (
              <div className="flex flex-col">
                {post.replies.map((reply, i) => (
                  <div key={reply.id} className={`flex flex-col gap-2 pb-4 pt-[14px] ${i < post.replies.length - 1 ? "border-b border-paper-2" : ""}`}>
                    <div className="flex flex-wrap items-center gap-[10px] font-typed">
                      <Link href={`/user/${reply.user.username}`} className="text-[14px] font-bold text-ink hover:text-blue">{reply.user.username}</Link>
                      <span className="text-[12px] text-steel-2">{timeAgo(reply.createdAt)}</span>
                    </div>
                    <p className="max-w-[620px] whitespace-pre-wrap text-[15px] leading-[1.55]">{reply.body}</p>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleReply} className="mt-2 flex flex-col gap-[10px] border border-steel px-[18px] pb-[14px] pt-4">
              <label className="flex flex-col gap-[10px]">
                <span className="lab">Your reply</span>
                <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Add to the thread." rows={3} className="ruled min-h-[66px] w-full resize-y bg-transparent text-[15px] text-ink outline-none placeholder:text-steel-2" />
              </label>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Typed>
                  {me ? `Signed ${me}` : (
                    <>
                      <Link href="/auth/signin" className="underline">Sign in</Link> to reply.
                    </>
                  )}
                </Typed>
                <Btn type="submit" variant="primary" disabled={submitting || !replyText.trim()} className="text-[17px]">
                  {submitting ? "Filing" : "File reply"}
                </Btn>
              </div>
              {note && <FormNote error>{note}</FormNote>}
            </form>
          </Section>
        </Sheet>
      </div>
    </div>
  );
}
