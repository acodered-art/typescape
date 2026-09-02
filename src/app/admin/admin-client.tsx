"use client";
import { useCallback, useEffect, useState } from "react";

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

export default function AdminDashboard() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [users, setUsers] = useState<UserData[]>([]);
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [tab, setTab] = useState<"stats" | "users" | "images">("stats");

  const fetchImages = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/images");
      if (res.ok) setPendingImages(await res.json());
    } catch {}
  }, []);

  useEffect(() => {
    fetch("/api/admin/stats").then((r) => { if (r.ok) r.json().then(setStats); });
    fetch("/api/admin/users").then((r) => { if (r.ok) r.json().then(setUsers); });
    fetchImages();
  }, [fetchImages]);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[#e8ecf4]">Admin</h1>
        <div className="flex gap-2 text-sm">
          <button
            onClick={() => setTab("stats")}
            className={`px-3 py-1 rounded transition-colors ${
              tab === "stats" ? "bg-[#64ffda]/20 text-[#64ffda]" : "text-[#7888a0] hover:text-[#c8d0dc]"
            }`}
          >
            Stats
          </button>
          <button
            onClick={() => setTab("users")}
            className={`px-3 py-1 rounded transition-colors ${
              tab === "users" ? "bg-[#64ffda]/20 text-[#64ffda]" : "text-[#7888a0] hover:text-[#c8d0dc]"
            }`}
          >
            Users
          </button>
          <button
            onClick={() => setTab("images")}
            className={`px-3 py-1 rounded transition-colors ${
              tab === "images" ? "bg-[#64ffda]/20 text-[#64ffda]" : "text-[#7888a0] hover:text-[#c8d0dc]"
            }`}
          >
            Images {pendingImages.length > 0 && `(${pendingImages.length})`}
          </button>
        </div>
      </div>

      {tab === "stats" && stats && (
        <div className="space-y-6">
          {/* Counts */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 text-center text-xs">
            {Object.entries(stats.counts).map(([key, value]) => (
              <div key={key} className="p-3 rounded border border-[#1a2234] bg-[#0e1420]">
                <div className="text-lg font-bold text-[#64ffda]">{value.toLocaleString()}</div>
                <div className="text-[#4a5a70] mt-0.5 capitalize">{key}</div>
              </div>
            ))}
          </div>

          {/* Top Typings */}
          <div>
            <h2 className="text-sm font-semibold text-[#7888a0] uppercase tracking-wider mb-2">
              Most Popular Typings
            </h2>
            <div className="space-y-1">
              {stats.topTypings.map((t, i) => (
                <div
                  key={`${t.typingSystemId}-${t.typeValue}`}
                  className="flex items-center justify-between px-3 py-1.5 rounded bg-[#0e1420] border border-[#1a2234] text-sm"
                >
                  <span>
                    <span className="text-[#c8d0dc]">{t.typeValue}</span>
                    <span className="text-[#4a5a70] ml-2">({t._count.id} assignments)</span>
                  </span>
                  <span className="text-[#4a5a70]">#{i + 1}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "users" && (
        <div className="space-y-2">
          {users.length === 0 ? (
            <p className="text-sm text-[#4a5a70] italic">No users yet.</p>
          ) : (
            users.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between px-3 py-2 rounded bg-[#0e1420] border border-[#1a2234] text-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[#c8d0dc] font-medium">{user.username}</span>
                  {user.role !== "user" && (
                    <span className="text-[#64ffda] text-xs uppercase">{user.role}</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex gap-3 text-xs text-[#4a5a70]">
                    <span>{user.reputation} rep</span>
                    <span>{user._count.profiles} profiles</span>
                    <span>{user._count.typings} typings</span>
                    <span>{user._count.votes} votes</span>
                  </div>
                  <div className="flex gap-1 ml-2 border-l border-[#1a2234] pl-2">
                    {user.role !== "moderator" && (
                      <button
                        onClick={async () => {
                          await fetch("/api/admin/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: user.id, role: "moderator" }) });
                          window.location.reload();
                        }}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-[#2a3f6e]/20 text-[#8ab4f8] hover:bg-[#2a3f6e]/40"
                      >
                        Mod
                      </button>
                    )}
                    {user.role !== "admin" && (
                      <button
                        onClick={async () => {
                          await fetch("/api/admin/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: user.id, role: "admin" }) });
                          window.location.reload();
                        }}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-[#64ffda]/10 text-[#64ffda] hover:bg-[#64ffda]/20"
                      >
                        Admin
                      </button>
                    )}
                    {user.role !== "user" && (
                      <button
                        onClick={async () => {
                          await fetch("/api/admin/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: user.id, role: "user" }) });
                          window.location.reload();
                        }}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-[#1a2234] text-[#4a5a70] hover:bg-[#2a3a4a]"
                      >
                        Demote
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "images" && (
        <div className="space-y-2">
          {pendingImages.length === 0 ? (
            <p className="text-sm text-[#4a5a70] italic">No pending images.</p>
          ) : (
            pendingImages.map((img) => (
              <div
                key={img.id}
                className="flex items-center gap-3 px-3 py-2 rounded bg-[#0e1420] border border-[#1a2234]"
              >
                {img.imageUrl && (
                  <img src={img.imageUrl} alt="" className="w-12 h-12 rounded object-cover bg-[#1a2234]" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-[#c8d0dc]">{img.name}</div>
                  <div className="text-xs text-[#4a5a70]">Status: {img.imageModeration}</div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleImageAction(img.id, "approve")}
                    className="px-2 py-1 text-xs rounded bg-[#64ffda]/10 text-[#64ffda] border border-[#64ffda]/20 hover:bg-[#64ffda]/20"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleImageAction(img.id, "reject")}
                    className="px-2 py-1 text-xs rounded bg-[#ff6b6b]/10 text-[#ff6b6b] border border-[#ff6b6b]/20 hover:bg-[#ff6b6b]/20"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}