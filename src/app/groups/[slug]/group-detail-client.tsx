"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function GroupDetailClient({ slug, isMember, isAdmin }: { slug: string; isMember: boolean; isAdmin: boolean }) {
  const [loading, setLoading] = useState(false);
  const [member, setMember] = useState(isMember);
  const router = useRouter();

  const handleJoin = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/groups/${slug}/members`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setMember(data.member);
        router.refresh();
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleJoin}
      disabled={loading}
      className={`shrink-0 px-4 py-2 text-sm rounded transition-colors ${
        member
          ? "bg-[#141c2b] text-[#7888a0] border border-[#1a2234] hover:border-[#ff6b6b]/40 hover:text-[#ff6b6b]"
          : "bg-[#64ffda]/10 text-[#64ffda] border border-[#64ffda]/20 hover:bg-[#64ffda]/20"
      }`}
    >
      {loading ? "..." : member ? (isAdmin ? "Admin" : "Leave") : "Join"}
    </button>
  );
}