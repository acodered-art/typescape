"use client";
import { useRouter } from "next/navigation";
import { use, useState } from "react";
import { Btn, PageTitle, Sheet, Typed } from "@/components/dossier";
import { FormNote } from "@/components/dossier/modal";

/** A new post on paper: title and body as fields, one primary "File the post". */
export default function NewPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !text.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/groups/${slug}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), text: text.trim() }),
      });
      if (res.ok) {
        const post = await res.json();
        router.push(`/groups/${slug}/post/${post.id}`);
      } else {
        const data = await res.json();
        setError(res.status === 401 ? "Sign in to post." : data.error || "That did not post.");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pb-10">
      <PageTitle title="New post" aside={`In ${slug}`} />
      <div className="max-w-[720px]">
        <Sheet>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1">
              <span className="lab">Title</span>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What the post is about" required maxLength={200} className="input-paper" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="lab">Body</span>
              <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Your analysis, your question, or the case you want to make." rows={8} required className="input-paper resize-y" />
              <Typed className="text-[12px] text-steel-2">{text.length} of 10000</Typed>
            </label>
            {error && <FormNote error>{error}</FormNote>}
            <div className="flex flex-col-reverse gap-3 border-t-2 border-ink pt-4 sm:flex-row sm:justify-end">
              <Btn onClick={() => router.back()}>Cancel</Btn>
              <Btn type="submit" variant="primary" disabled={loading || !title.trim() || !text.trim()}>
                {loading ? "Filing" : "File the post"}
              </Btn>
            </div>
          </form>
        </Sheet>
      </div>
    </div>
  );
}
