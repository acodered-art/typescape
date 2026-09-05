"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Btn } from "@/components/dossier";

/** Join is the one primary button on a group; a member sees Leave (or Admin) as a secondary. */
export function GroupDetailClient({ slug, isMember, isAdmin }: { slug: string; isMember: boolean; isAdmin: boolean }) {
  const [loading, setLoading] = useState(false);
  const [member, setMember] = useState(isMember);
  const [note, setNote] = useState("");
  const router = useRouter();

  const handleJoin = async () => {
    setLoading(true);
    setNote("");
    try {
      const res = await fetch(`/api/groups/${slug}/members`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setMember(data.member);
        router.refresh();
      } else if (res.status === 401) {
        setNote("Sign in to join.");
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      {note && <span className="font-typed text-[13px] text-paper/70">{note}</span>}
      <Btn variant={member ? "desk" : "primary"} onClick={handleJoin} disabled={loading}>
        {loading ? "Filing" : member ? (isAdmin ? "Admin" : "Leave") : "Join"}
      </Btn>
    </div>
  );
}
