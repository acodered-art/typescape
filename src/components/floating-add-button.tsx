"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

export function FloatingAddButton() {
  const [user, setUser] = useState<{ username: string } | null>(null);

  useEffect(() => {
    const m = document.cookie.match(/(?:^|;\s*)user=([^;]+)/);
    if (m) {
      try { setUser(JSON.parse(decodeURIComponent(m[1]))); } catch {}
    }
  }, []);

  if (!user) return null;

  return (
    <Link
      href="/create"
      className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full bg-[#64ffda] text-[#0a0e17] flex items-center justify-center text-2xl font-bold shadow-lg hover:bg-[#4ad0b0] transition-colors"
      title="Add a profile"
    >
      +
    </Link>
  );
}