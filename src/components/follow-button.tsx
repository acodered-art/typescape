"use client";
import { useCallback, useEffect, useState } from "react";

export function FollowButton({ username }: { username: string }) {
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleFollow = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/follow/${username}`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setFollowing(data.following);
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleFollow}
      disabled={loading}
      className={`px-3 py-1 text-xs rounded border transition-colors ${
        following
          ? "bg-[#64ffda]/20 text-[#64ffda] border-[#64ffda]/40"
          : "bg-[#141c2b] text-[#7888a0] border-[#1a2234] hover:border-[#64ffda]/40 hover:text-[#64ffda]"
      }`}
    >
      {loading ? "..." : following ? "Following" : "Follow"}
    </button>
  );
}