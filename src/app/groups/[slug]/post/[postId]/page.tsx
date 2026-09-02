"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

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
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function PostPage({ params }: { params: Promise<{ slug: string; postId: string }> }) {
  const [slug, setSlug] = useState("");
  const [postId, setPostId] = useState("");
  const [post, setPost] = useState<PostDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useState(() => { params.then((p) => { setSlug(p.slug); setPostId(p.postId); }); });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!slug || !postId) return;
      try {
        const res = await fetch(`/api/groups/${slug}/posts/${postId}`);
        if (!cancelled && res.ok) setPost(await res.json());
      } catch {} finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [slug, postId]);

  const handleReply = async () => {
    if (!replyText.trim()) return;
    setSubmitting(true);
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
        alert(data.error || "Failed to reply");
      }
    } catch {
      alert("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p className="text-sm text-[#4a5a70] p-4">Loading post...</p>;
  if (!post) return <p className="text-sm text-[#ff6b6b] p-4">Post not found.</p>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Post */}
      <div className="p-4 rounded-lg border border-[#1a2234] bg-[#0e1420]">
        <div className="flex items-center gap-2 text-xs text-[#4a5a70] mb-2">
          <Link href={`/user/${post.user.username}`} className="text-[#64ffda] hover:underline font-medium">
            {post.user.username}
          </Link>
          <span>{timeAgo(post.createdAt)}</span>
        </div>
        <h1 className="text-base font-bold text-[#e8ecf4] mb-2">{post.title}</h1>
        <p className="text-sm text-[#c8d0dc] whitespace-pre-wrap leading-relaxed">{post.body}</p>
      </div>

      {/* Replies */}
      <section>
        <h2 className="text-sm font-semibold text-[#7888a0] uppercase tracking-wider mb-3">
          Replies ({post.replies.length})
        </h2>

        <div className="space-y-2">
          {post.replies.length === 0 ? (
            <p className="text-sm text-[#4a5a70] italic">No replies yet. Be the first!</p>
          ) : (
            post.replies.map((reply) => (
              <div key={reply.id} className="p-3 rounded border border-[#1a2234] bg-[#0e1420]">
                <div className="flex items-center gap-2 text-xs text-[#4a5a70] mb-1">
                  <Link href={`/user/${reply.user.username}`} className="text-[#64ffda] hover:underline font-medium">
                    {reply.user.username}
                  </Link>
                  <span>{timeAgo(reply.createdAt)}</span>
                </div>
                <p className="text-sm text-[#c8d0dc] whitespace-pre-wrap">{reply.body}</p>
              </div>
            ))
          )}
        </div>

        {/* Reply Form */}
        <div className="mt-4 flex gap-2">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Write a reply..."
            rows={2}
            className="flex-1 px-3 py-2 text-sm bg-[#141c2b] border border-[#1a2234] rounded text-[#c8d0dc] placeholder-[#4a5a70] focus:outline-none focus:border-[#64ffda]/40 resize-none"
          />
          <button
            onClick={handleReply}
            disabled={submitting || !replyText.trim()}
            className="shrink-0 px-4 py-2 text-sm rounded bg-[#64ffda]/10 text-[#64ffda] border border-[#64ffda]/20 hover:bg-[#64ffda]/20 disabled:opacity-30 self-end"
          >
            {submitting ? "..." : "Reply"}
          </button>
        </div>
      </section>
    </div>
  );
}