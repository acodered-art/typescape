"use client";
import { useCallback, useEffect, useState } from "react";

interface CommentUser {
  username: string;
  avatarUrl: string | null;
  reputation: number;
}

interface CommentData {
  id: string;
  body: string;
  createdAt: string;
  voteCount: number;
  user: CommentUser;
  replies?: CommentData[];
}

interface CommentSectionProps {
  profileSlug: string;
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function CommentSection({ profileSlug }: CommentSectionProps) {
  const [comments, setComments] = useState<CommentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [myVotes, setMyVotes] = useState<Record<string, number>>({});

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/profiles/${profileSlug}/comments`);
      if (res.ok) setComments(await res.json());
    } catch {} finally {
      setLoading(false);
    }
  }, [profileSlug]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleVote = async (commentId: string, voteValue: 1 | -1) => {
    const prevVote = myVotes[commentId] || 0;
    // Optimistic update
    const newVote = prevVote === voteValue ? 0 : voteValue;
    setMyVotes((v) => ({ ...v, [commentId]: newVote }));

    // Calculate delta for this vote change
    // prevVote=0, newVote=1  → +1
    // prevVote=0, newVote=-1 → -1
    // prevVote=1, newVote=0  → -1 (remove upvote)
    // prevVote=-1, newVote=0 → +1 (remove downvote)
    // prevVote=1, newVote=-1 → -2 (change upvote to downvote)
    // prevVote=-1, newVote=1 → +2 (change downvote to upvote)
    let delta = newVote - prevVote;
    if (prevVote !== 0 && newVote !== 0) {
      // Switching from one to the other
      delta = (prevVote === 1 ? -1 : 1) + (newVote === 1 ? 1 : -1);
    }

    setComments((prev) =>
      prev.map((c) => {
        const update = (com: CommentData): CommentData => {
          if (com.id === commentId) {
            return { ...com, voteCount: Math.max(0, com.voteCount + delta) };
          }
          if (com.replies) {
            return { ...com, replies: com.replies.map(update) };
          }
          return com;
        };
        return update(c);
      })
    );

    try {
      const res = await fetch(`/api/comments/${commentId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voteValue }),
      });
      if (!res.ok) {
        setMyVotes((v) => ({ ...v, [commentId]: prevVote }));
        fetchComments();
      }
    } catch {
      setMyVotes((v) => ({ ...v, [commentId]: prevVote }));
      fetchComments();
    }
  };

  const submitComment = async (body: string, parentId?: string | null) => {
    if (!body.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/profiles/${profileSlug}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: body.trim(), parentId: parentId || undefined }),
      });
      if (res.ok) {
        setNewComment("");
        setReplyText("");
        setReplyTo(null);
        fetchComments();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to post comment");
      }
    } catch {
      alert("Failed to post comment");
    } finally {
      setSubmitting(false);
    }
  };

  const renderComment = (comment: CommentData, isReply = false) => {
    const myVote = myVotes[comment.id];

    return (
      <div key={comment.id} className={`${isReply ? "ml-4 mt-2" : ""} p-3 rounded border border-[#1a2234] bg-[#0e1420]`}>
        <div className="flex items-center gap-2 text-xs text-[#7888a0] mb-1">
          <span className="text-[#c8d0dc] font-medium">
            {comment.user.username || "anonymous"}
          </span>
          <span>{timeAgo(comment.createdAt)}</span>
          {comment.user.reputation > 0 && (
            <span className="text-[#64ffda]">{comment.user.reputation} rep</span>
          )}
        </div>
        <p className="text-sm text-[#c8d0dc] whitespace-pre-wrap">{comment.body}</p>
        <div className="flex items-center gap-2 mt-1">
          <button
            onClick={() => handleVote(comment.id, 1)}
            className={`text-xs px-1.5 py-0.5 rounded transition-colors ${
              myVote === 1 ? "bg-[#64ffda]/20 text-[#64ffda]" : "text-[#4a5a70] hover:text-[#64ffda]"
            }`}
            title="Upvote"
          >
            ▲
          </button>
          <span className="text-xs text-[#7888a0] min-w-[1.5rem] text-center">{comment.voteCount}</span>
          <button
            onClick={() => handleVote(comment.id, -1)}
            className={`text-xs px-1.5 py-0.5 rounded transition-colors ${
              myVote === -1 ? "bg-[#ff6b6b]/20 text-[#ff6b6b]" : "text-[#4a5a70] hover:text-[#ff6b6b]"
            }`}
            title="Downvote"
          >
            ▼
          </button>
          {!isReply && (
            <button
              onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
              className="text-xs text-[#4a5a70] hover:text-[#64ffda] ml-2 transition-colors"
            >
              Reply
            </button>
          )}
        </div>

        {/* Reply form */}
        {replyTo === comment.id && (
          <div className="flex gap-2 mt-2 ml-4">
            <input
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write a reply..."
              className="flex-1 px-2 py-1 text-xs bg-[#141c2b] border border-[#1a2234] rounded text-[#c8d0dc] placeholder-[#4a5a70] focus:outline-none focus:border-[#64ffda]/40"
            />
            <button
              onClick={() => submitComment(replyText, comment.id)}
              disabled={submitting || !replyText.trim()}
              className="px-2 py-1 text-xs rounded bg-[#64ffda]/10 text-[#64ffda] disabled:opacity-30"
            >
              {submitting ? "..." : "Reply"}
            </button>
          </div>
        )}

        {/* Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-2 space-y-2">
            {comment.replies.map((reply) => renderComment(reply, true))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-[#7888a0] uppercase tracking-wider">
        Comments ({comments.length})
      </h2>

      {/* New Comment Form */}
      <div className="flex gap-2">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment... (sign in required)"
          rows={2}
          className="flex-1 px-3 py-2 text-sm bg-[#141c2b] border border-[#1a2234] rounded text-[#c8d0dc] placeholder-[#4a5a70] focus:outline-none focus:border-[#64ffda]/40 resize-none"
        />
        <button
          onClick={() => submitComment(newComment)}
          disabled={submitting || !newComment.trim()}
          className="px-3 py-2 text-xs rounded bg-[#64ffda]/10 text-[#64ffda] border border-[#64ffda]/20 hover:bg-[#64ffda]/20 disabled:opacity-30 transition-colors self-end"
        >
          {submitting ? "..." : "Post"}
        </button>
      </div>

      {/* Comments List */}
      {loading ? (
        <p className="text-sm text-[#4a5a70]">Loading comments...</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-[#4a5a70] italic">No comments yet.</p>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => renderComment(comment))}
        </div>
      )}
    </div>
  );
}