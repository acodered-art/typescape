"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface UserInfo {
  id?: string;
  username: string;
  role?: string;
}

function readUserCookie(): UserInfo | null {
  const m = document.cookie.match(/(?:^|;\s*)user=([^;]+)/);
  if (!m) return null;
  try { return JSON.parse(decodeURIComponent(m[1])); } catch { return null; }
}

export function Header() {
  const [query, setQuery] = useState("");
  const [user, setUser] = useState<UserInfo | null>(null);
  const router = useRouter();

  const refreshUser = useCallback(() => {
    const cookieUser = readUserCookie();
    setUser(cookieUser);
    // Fetch full user info (with role) for OAuth users
    fetch("/api/me")
      .then((r) => r.json())
      .then((data) => {
        if (data?.user) {
          setUser({ username: data.user.username, role: data.user.role });
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshUser();
    // Refresh user on cookie changes (login/logout)
    window.addEventListener("focus", refreshUser);
    return () => window.removeEventListener("focus", refreshUser);
  }, [refreshUser]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  const handleSignOut = async () => {
    await fetch("/api/signout", { method: "POST" });
    setUser(null);
    router.push("/");
    router.refresh();
  };

  return (
    <header className="border-b border-[#1a2234] bg-[#0a0e17]/90 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        <Link href="/" className="text-lg font-bold text-[#64ffda] tracking-tight shrink-0">
          TypeScape
        </Link>
        <nav className="hidden sm:flex items-center gap-4 text-sm text-[#7888a0]">
          <Link href="/search" className="hover:text-[#64ffda] transition-colors">Browse</Link>
          <Link href="/systems" className="hover:text-[#64ffda] transition-colors">Systems</Link>
          <Link href="/collections" className="hover:text-[#64ffda] transition-colors">Collections</Link>
          <Link href="/groups" className="hover:text-[#64ffda] transition-colors">Groups</Link>
          <Link href="/compare" className="hover:text-[#64ffda] transition-colors">Compare</Link>
          <Link href="/feed" className="hover:text-[#64ffda] transition-colors">Feed</Link>
          <Link href="/test" className="hover:text-[#64ffda] transition-colors">Tests</Link>
          <Link href="/create" className="hover:text-[#64ffda] transition-colors">Create</Link>
        </nav>
        <form onSubmit={handleSearch} className="flex-1 max-w-md">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search characters, celebrities..."
            className="w-full px-3 py-1.5 text-sm bg-[#141c2b] border border-[#1a2234] rounded text-[#c8d0dc] placeholder-[#4a5a70] focus:outline-none focus:border-[#64ffda]/40 transition-colors"
          />
        </form>
        <div className="flex items-center gap-2 text-sm">
          {user ? (
            <div className="flex items-center gap-2">
              <Link
                href={`/user/${user.username}`}
                className="text-[#64ffda] hover:underline text-xs"
              >
                {user.username}
              </Link>
              <Link
                href="/settings"
                className="text-[#4a5a70] hover:text-[#c8d0dc] transition-colors text-xs"
                title="Settings"
              >
                ⚙
              </Link>
              {user.role === "admin" && (
                <Link
                  href="/admin"
                  className="text-[#4a5a70] hover:text-[#64ffda] transition-colors text-xs"
                >
                  Admin
                </Link>
              )}
              <button
                onClick={handleSignOut}
                className="text-[#4a5a70] hover:text-[#ff6b6b] transition-colors text-xs"
              >
                Sign out
              </button>
            </div>
          ) : (
            <Link href="/auth/signin" className="text-[#7888a0] hover:text-[#64ffda] transition-colors">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}