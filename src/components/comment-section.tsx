"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Btn, SectionHead, Typed } from "@/components/dossier";
import { FormNote } from "@/components/dossier/modal";
import { useReaderHandle } from "@/components/dossier/reader";

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

/** "3 days ago", spelled out; the file is a record, not a feed. */
function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} ${months === 1 ? "month" : "months"} ago`;
  const years = Math.floor(days / 365);
  return `${years} ${years === 1 ? "year" : "years"} ago`;
}

function Chevron({ up, size }: { up: boolean; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
      <path d={up ? "M5 15l7-7 7 7" : "M5 9l7 7 7-7"} />
    </svg>
  );
}

function Triangle({ up, size }: { up: boolean; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d={up ? "M12 6l8 9H4z" : "M12 18l-8-9h16z"} />
    </svg>
  );
}

/**
 * The notes on a file. The composer comes first; notes sit on a 44px vote gutter (the reader's own vote is a
 * filled blue triangle), signed with the handle and the time, replies on a steel thread line. Top-level notes
 * are ordered most agreed first, replies stay in the order they were filed.
 */
export function CommentSection({ profileSlug }: CommentSectionProps) {
  const me = useReaderHandle();
  const [comments, setComments] = useState<CommentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [myVotes, setMyVotes] = useState<Record<string, number>>({});
  const [note, setNote] = useState("");

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/profiles/${profileSlug}/comments`);
      if (res.ok) setComments(await res.json());
    } catch {} finally {
      setLoading(false);
    }
  }, [profileSlug]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/profiles/${profileSlug}/comments`);
        if (cancelled) return;
        if (res.ok) setComments(await res.json());
      } catch {} finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [profileSlug]);

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
        if (res.status === 401) setNote("Sign in to vote on a note.");
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
    setNote("");
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
        setNote(res.status === 401 ? "Sign in to file a note." : data.error || "That note did not go through.");
      }
    } catch {
      setNote("That note did not go through.");
    } finally {
      setSubmitting(false);
    }
  };

  const gutter = (comment: CommentData, size: number) => {
    const myVote = myVotes[comment.id];
    return (
      <div className={`flex flex-col items-center gap-[1px] ${myVote ? "text-blue" : "text-navy"}`}>
        <button type="button" onClick={() => handleVote(comment.id, 1)} className="hover:text-blue" aria-pressed={myVote === 1} title="Agree with this note">
          {myVote === 1 ? <Triangle up size={size} /> : <Chevron up size={size} />}
        </button>
        <span className="font-typed text-[14px] font-bold">{comment.voteCount}</span>
        <button type="button" onClick={() => handleVote(comment.id, -1)} className="hover:text-blue" aria-pressed={myVote === -1} title="Disagree with this note">
          {myVote === -1 ? <Triangle up={false} size={size} /> : <Chevron up={false} size={size} />}
        </button>
      </div>
    );
  };

  const renderComment = (comment: CommentData, isReply = false, last = false) => (
    <div key={comment.id} className={`grid ${isReply ? "grid-cols-[36px_minmax(0,1fr)] gap-3 pb-3 pt-[14px]" : "grid-cols-[44px_minmax(0,1fr)] gap-[14px] pb-4 pt-[18px]"} ${last ? "" : "border-b border-paper-2"}`}>
      {gutter(comment, isReply ? 16 : 18)}
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <div className="flex flex-wrap items-center gap-[10px] font-typed">
            <Link href={`/user/${comment.user.username}`} className="text-[14px] font-bold text-ink hover:text-blue">
              {comment.user.username || "anonymous"}
            </Link>
            <span className="text-[12px] text-steel-2">
              {comment.user.reputation === 0 ? "new reader, " : ""}
              {timeAgo(comment.createdAt)}
            </span>
          </div>
          {!isReply && (
            <button type="button" onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)} className="font-typed text-[12px] font-bold tracking-[0.1em] text-blue hover:text-navy">
              {replyTo === comment.id ? "CLOSE" : "REPLY"}
            </button>
          )}
        </div>
        <p className="max-w-[620px] whitespace-pre-wrap text-[15px] leading-[1.55]">{comment.body}</p>

        {replyTo === comment.id && (
          <form
            className="flex flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              submitComment(replyText, comment.id);
            }}
          >
            <input value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder={me ? `Reply as ${me}` : "Sign in to reply"} className="input-paper" />
            <Btn type="submit" variant="small" disabled={submitting || !replyText.trim()} className="shrink-0 self-start px-3 py-[9px]">
              {submitting ? "Filing" : "File reply"}
            </Btn>
          </form>
        )}

        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-1 flex flex-col border-l border-steel pl-[18px]">
            {comment.replies.map((reply, i) => renderComment(reply, true, i === comment.replies!.length - 1))}
          </div>
        )}
      </div>
    </div>
  );

  const ordered = [...comments].sort((a, b) => b.voteCount - a.voteCount);

  return (
    <div className="flex flex-col gap-[14px]">
      <SectionHead title="Discussion" aside={comments.length > 1 ? "Most agreed first" : undefined} />

      <form
        className="flex flex-col gap-[10px] border border-steel px-[18px] pb-[14px] pt-4"
        onSubmit={(e) => {
          e.preventDefault();
          submitComment(newComment);
        }}
      >
        <label className="flex flex-col gap-[10px]">
          <span className="lab">Your note</span>
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Cite a scene or an exhibit. Your handle is signed underneath."
            rows={3}
            className="ruled min-h-[66px] w-full resize-y bg-transparent text-[15px] text-ink outline-none placeholder:text-steel-2"
          />
        </label>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Typed>
            {me ? (
              `Signed ${me}`
            ) : (
              <>
                <Link href="/auth/signin" className="underline">Sign in</Link> to file a note.
              </>
            )}
          </Typed>
          <Btn type="submit" variant="primary" disabled={submitting || !newComment.trim()} className="text-[17px]">
            {submitting ? "Filing" : "File note"}
          </Btn>
        </div>
        {note && <FormNote error>{note}</FormNote>}
      </form>

      {loading ? (
        <Typed>Opening the notes.</Typed>
      ) : ordered.length === 0 ? (
        <Typed className="text-[14px]">No notes on this file yet. File the first one.</Typed>
      ) : (
        <div className="flex flex-col">{ordered.map((comment, i) => renderComment(comment, false, i === ordered.length - 1))}</div>
      )}
    </div>
  );
}
