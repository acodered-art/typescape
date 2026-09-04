"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Btn, FolderTab, InkTag, PageTitle, Portrait, SectionHead, Sheet, TabStrip, Typed } from "@/components/dossier";

interface StatsData {
  counts: Record<string, number>;
  topTypings: { typingSystemId: string; typeValue: string; _count: { id: number } }[];
}

interface UserData {
  id: string;
  username: string;
  email: string | null;
  role: string;
  reputation: number;
  createdAt: string;
  _count: { profiles: number; typings: number; votes: number; comments: number };
}

interface PendingImage {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  imageUploadedBy: string | null;
  imageModeration: string;
}

/** The site's counts in the file's words. Unknown keys print as they come. */
const WORDS: Record<string, [string, string]> = {
  profiles: ["file", "files"],
  typings: ["read", "reads"],
  votes: ["vote", "votes"],
  users: ["reader", "readers"],
  comments: ["note", "notes"],
  evidence: ["exhibit", "exhibits"],
  collections: ["collection", "collections"],
  groups: ["group", "groups"],
};

function countsSentence(counts: Record<string, number>): string {
  const parts = Object.entries(counts).map(([k, v]) => {
    const w = WORDS[k];
    return w ? `${v} ${v === 1 ? w[0] : w[1]}` : `${v} ${k}`;
  });
  if (parts.length === 0) return "Nothing on the record.";
  if (parts.length === 1) return `${parts[0]} on the record.`;
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]} on the record.`;
}

type Tab = "stats" | "users" | "images";

export default function AdminDashboard() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [users, setUsers] = useState<UserData[]>([]);
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [tab, setTab] = useState<Tab>("stats");

  const fetchImages = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/images");
      if (res.ok) setPendingImages(await res.json());
    } catch {}
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [sRes, uRes, iRes] = await Promise.all([fetch("/api/admin/stats"), fetch("/api/admin/users"), fetch("/api/admin/images")]);
        if (cancelled) return;
        if (sRes.ok) setStats(await sRes.json());
        if (uRes.ok) setUsers(await uRes.json());
        if (iRes.ok) setPendingImages(await iRes.json());
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  const handleImageAction = async (profileId: string, action: "approve" | "reject") => {
    try {
      const res = await fetch("/api/admin/images", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, action }),
      });
      if (res.ok) fetchImages();
    } catch {}
  };

  const setRole = async (userId: string, role: "moderator" | "admin" | "user") => {
    await fetch("/api/admin/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, role }) });
    window.location.reload();
  };

  return (
    <div className="pb-10">
      <PageTitle title="Admin" aside={stats ? countsSentence(stats.counts) : "Opening the desk."} />
      <TabStrip className="pt-0">
        <FolderTab active={tab === "stats"} onClick={() => setTab("stats")}>Record</FolderTab>
        <FolderTab active={tab === "users"} onClick={() => setTab("users")}>Readers</FolderTab>
        <FolderTab active={tab === "images"} onClick={() => setTab("images")}>
          Portraits{pendingImages.length > 0 ? ` (${pendingImages.length})` : ""}
        </FolderTab>
      </TabStrip>
      <Sheet className="flex flex-col gap-[14px]">
        {tab === "stats" && (
          <>
            <SectionHead title="Most filed reads" aside={stats ? `${stats.topTypings.length} listed` : undefined} />
            {!stats ? (
              <Typed>Opening the record.</Typed>
            ) : stats.topTypings.length === 0 ? (
              <Typed className="text-[14px]">No reads on the record yet.</Typed>
            ) : (
              stats.topTypings.map((t, i) => (
                <div key={`${t.typingSystemId}-${t.typeValue}`} className="row-fill flex items-baseline justify-between gap-4 px-3 py-[10px]">
                  <span className="font-typed text-[22px] font-bold">{t.typeValue}</span>
                  <Typed>
                    {t._count.id} {t._count.id === 1 ? "read" : "reads"}, {i + 1}
                    {i === 0 ? "st" : i === 1 ? "nd" : i === 2 ? "rd" : "th"}
                  </Typed>
                </div>
              ))
            )}
          </>
        )}

        {tab === "users" && (
          <>
            <SectionHead title="Readers" aside={`${users.length} on file`} />
            {users.length === 0 ? (
              <Typed className="text-[14px]">No readers yet.</Typed>
            ) : (
              users.map((user) => (
                <div key={user.id} className="row-fill flex flex-col gap-2 px-3 py-[10px] md:grid md:grid-cols-[200px_minmax(0,1fr)_auto] md:items-center md:gap-4">
                  <div className="flex items-center gap-2">
                    <Link href={`/user/${user.username}`} className="font-display text-[18px] font-bold uppercase tracking-[0.04em] text-ink hover:text-navy">{user.username}</Link>
                    {user.role !== "user" && <InkTag>{user.role}</InkTag>}
                  </div>
                  <Typed className="text-[12px]">
                    {user.reputation} reputation, {user._count.profiles} files, {user._count.typings} reads, {user._count.votes} votes, {user._count.comments} notes
                  </Typed>
                  <div className="flex flex-wrap gap-2">
                    {user.role !== "moderator" && <Btn variant="small" onClick={() => setRole(user.id, "moderator")}>Moderator</Btn>}
                    {user.role !== "admin" && <Btn variant="small" onClick={() => setRole(user.id, "admin")}>Admin</Btn>}
                    {user.role !== "user" && <Btn variant="small" onClick={() => setRole(user.id, "user")} className="border-navy text-navy">Demote</Btn>}
                  </div>
                </div>
              ))
            )}
          </>
        )}

        {tab === "images" && (
          <>
            <SectionHead title="Portraits for review" aside={pendingImages.length > 0 ? `${pendingImages.length} waiting` : "None waiting"} />
            {pendingImages.length === 0 ? (
              <Typed className="text-[14px]">Nothing to review.</Typed>
            ) : (
              pendingImages.map((img) => (
                <div key={img.id} className="row-fill flex flex-wrap items-center gap-4 px-3 py-[10px]">
                  <Portrait src={img.imageUrl} alt="" />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <Link href={`/profiles/${img.slug}`} className="font-display text-[22px] font-extrabold uppercase leading-none text-ink hover:text-navy">{img.name}</Link>
                    <Typed className="text-[12px]">
                      {img.imageModeration}
                      {img.imageUploadedBy ? `, sent by ${img.imageUploadedBy}` : ""}
                    </Typed>
                  </div>
                  <div className="flex gap-2">
                    <Btn variant="small" onClick={() => handleImageAction(img.id, "approve")}>Approve</Btn>
                    <Btn variant="small" onClick={() => handleImageAction(img.id, "reject")} className="border-navy text-navy">Reject</Btn>
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </Sheet>
    </div>
  );
}
