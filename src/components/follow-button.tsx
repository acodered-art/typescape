"use client";
import { useState } from "react";
import { Btn } from "@/components/dossier";
import { FormNote } from "@/components/dossier/modal";

/** The one primary button on another reader's file. The API toggles and reports the new state. */
export function FollowButton({ username }: { username: string }) {
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState("");

  const handleFollow = async () => {
    setLoading(true);
    setNote("");
    try {
      const res = await fetch(`/api/follow/${username}`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setFollowing(data.following);
      } else if (res.status === 401) {
        setNote("Sign in to follow a reader.");
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <Btn variant={following ? "secondary" : "primary"} onClick={handleFollow} disabled={loading}>
        {loading ? "Filing" : following ? "Following" : "Follow"}
      </Btn>
      {note && <FormNote error>{note}</FormNote>}
    </div>
  );
}
