"use client";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

interface UserInfo {
  id?: string;
  username: string;
  role?: string;
}

// The signed-in reader is an external system (a cookie the server sets), read through useSyncExternalStore.
function subscribeToWindowFocus(onChange: () => void) {
  window.addEventListener("focus", onChange);
  return () => window.removeEventListener("focus", onChange);
}
function readUserCookieRaw(): string {
  const m = document.cookie.match(/(?:^|;\s*)user=([^;]+)/);
  return m ? m[1] : "";
}
const noCookie = () => "";

const NAV = [
  { href: "/search", label: "Browse" },
  { href: "/systems", label: "Systems" },
  { href: "/compare", label: "Compare" },
  { href: "/feed", label: "Feed" },
  { href: "/test", label: "Tests" },
  { href: "/collections", label: "Collections" },
  { href: "/groups", label: "Groups" },
];

function SearchIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
    </svg>
  );
}

/**
 * Site chrome: a 60px bar on the desk with a 3px blue rule under it.
 * Desktop: wordmark, section links, the search box, Sign in or the reader's chip.
 * Phone (below md): wordmark plus two 44px buttons; the menu is a full-height navy drawer
 * listing every section, since the old site hid the whole nav below 640px.
 */
export function Header() {
  const [query, setQuery] = useState("");
  const router = useRouter();
  const pathname = usePathname();

  // Overlays are keyed by the path they were opened on, so a navigation closes them without an effect.
  const [drawerAt, setDrawerAt] = useState<string | null>(null);
  const [menuAt, setMenuAt] = useState<string | null>(null);
  const [phoneSearchAt, setPhoneSearchAt] = useState<string | null>(null);
  const drawer = drawerAt === pathname;
  const menu = menuAt === pathname;
  const phoneSearch = phoneSearchAt === pathname;
  const setDrawer = (open: boolean) => setDrawerAt(open ? pathname : null);
  const setMenu = (open: boolean) => setMenuAt(open ? pathname : null);
  const setPhoneSearch = (open: boolean) => setPhoneSearchAt(open ? pathname : null);

  // Who is signed in: the custom-auth cookie first, then /api/me (OAuth users and the role).
  const cookieRaw = useSyncExternalStore(subscribeToWindowFocus, readUserCookieRaw, noCookie);
  const cookieUser = useMemo<UserInfo | null>(() => {
    if (!cookieRaw) return null;
    try { return JSON.parse(decodeURIComponent(cookieRaw)); } catch { return null; }
  }, [cookieRaw]);
  const [apiUser, setApiUser] = useState<UserInfo | null>(null);
  const [signedOut, setSignedOut] = useState(false);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/me")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data?.user) setApiUser({ username: data.user.username, role: data.user.role });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [pathname]);
  const user = signedOut ? null : (apiUser ?? cookieUser);

  // Lock the page behind the drawer.
  useEffect(() => {
    document.body.style.overflow = drawer ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [drawer]);

  const handleSearch = (e: { preventDefault(): void }) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setDrawer(false);
    router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  const handleSignOut = async () => {
    await fetch("/api/signout", { method: "POST" });
    setApiUser(null);
    setSignedOut(true);
    setMenu(false);
    router.push("/");
    router.refresh();
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const onOwnFile = user ? pathname === `/user/${user.username}` : false;

  return (
    <header className="sticky top-0 z-50 border-b-[3px] border-blue bg-ink">
      <div className="mx-auto flex h-[56px] max-w-[1100px] items-center justify-between gap-4 px-4 md:h-[60px] md:px-10">
        <div className="flex items-center gap-8">
          <Link href="/" className="font-display text-[28px] font-extrabold uppercase leading-none tracking-[0.06em] text-blue hover:text-blue md:text-[33px]">
            TypeScape
          </Link>
          <nav className="hidden items-center gap-[18px] text-[15px] md:flex" aria-label="Sections">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className={`nav-link ${isActive(n.href) ? "nav-link-active" : ""}`}>
                {n.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Desktop: search box + sign in / reader chip */}
        <div className="hidden items-center gap-[14px] md:flex">
          <form onSubmit={handleSearch} role="search" className="flex h-9 w-[200px] items-center gap-2 bg-navy px-3 text-paper/50">
            <SearchIcon />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the files"
              aria-label="Search the files"
              className="w-full bg-transparent text-[14px] text-paper outline-none placeholder:text-paper/50"
            />
          </form>
          {user ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenu(!menu)}
                aria-expanded={menu}
                aria-haspopup="menu"
                className={`flex items-center gap-[9px] border border-blue py-[7px] pl-[10px] pr-[14px] font-display text-[19px] font-bold uppercase leading-none tracking-[0.1em] ${onOwnFile ? "bg-blue text-ink" : "text-blue hover:bg-blue hover:text-ink"}`}
              >
                <PersonIcon />
                <span>{user.username}</span>
              </button>
              {menu && (
                <div role="menu" className="absolute right-0 top-[calc(100%+8px)] z-50 flex min-w-[190px] flex-col bg-navy py-1 font-typed text-[14px] shadow-[0_12px_28px_rgba(0,0,0,0.45)]">
                  <Link role="menuitem" href={`/user/${user.username}`} className="px-4 py-[9px] text-paper hover:bg-blue hover:text-ink">Your file</Link>
                  <Link role="menuitem" href="/settings" className="px-4 py-[9px] text-paper hover:bg-blue hover:text-ink">Settings</Link>
                  {user.role === "admin" && (
                    <Link role="menuitem" href="/admin" className="px-4 py-[9px] text-paper hover:bg-blue hover:text-ink">Admin</Link>
                  )}
                  <button role="menuitem" type="button" onClick={handleSignOut} className="px-4 py-[9px] text-left text-paper/70 hover:bg-blue hover:text-ink">Sign out</button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/auth/signin" className="border border-blue px-4 py-[9px] font-display text-[19px] font-bold uppercase leading-none tracking-[0.1em] text-blue hover:bg-blue hover:text-ink">
              Sign in
            </Link>
          )}
        </div>

        {/* Phone: search toggle + menu button, 44px targets */}
        <div className="flex items-center gap-1 md:hidden">
          <button type="button" onClick={() => setPhoneSearch(!phoneSearch)} aria-label="Search" aria-expanded={phoneSearch} className="flex h-11 w-11 items-center justify-center text-paper">
            <SearchIcon size={22} />
          </button>
          <button type="button" onClick={() => setDrawer(true)} aria-label="Open menu" aria-expanded={drawer} className="flex h-11 w-11 items-center justify-center text-paper">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
          </button>
        </div>
      </div>

      {phoneSearch && (
        <form onSubmit={handleSearch} role="search" className="flex px-4 pb-3 md:hidden">
          <div className="flex h-[50px] flex-1 items-center gap-2 bg-paper px-3 text-navy">
            <SearchIcon size={15} />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the files"
              aria-label="Search the files"
              className="w-full bg-transparent font-typed text-[14px] text-navy outline-none placeholder:text-steel-2"
            />
          </div>
          <button type="submit" className="flex h-[50px] items-center bg-blue px-[18px] font-display text-[20px] font-extrabold uppercase tracking-[0.12em] text-ink">Search</button>
        </form>
      )}

      {drawer && (
        <div className="fixed inset-0 z-[60] flex flex-col overflow-y-auto bg-navy text-paper md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="flex h-[56px] shrink-0 items-center justify-between border-b-[3px] border-blue bg-ink px-4">
            <Link href="/" className="font-display text-[28px] font-extrabold uppercase leading-none tracking-[0.06em] text-blue hover:text-blue">TypeScape</Link>
            <button type="button" onClick={() => setDrawer(false)} aria-label="Close menu" className="flex h-11 w-11 items-center justify-center text-paper">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
          <form onSubmit={handleSearch} role="search" className="px-4 pt-5">
            <div className="flex h-[50px] items-center gap-2 bg-paper px-3 text-navy">
              <SearchIcon size={15} />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search the files"
                aria-label="Search the files"
                className="w-full bg-transparent font-typed text-[14px] text-navy outline-none placeholder:text-steel-2"
              />
            </div>
          </form>
          <nav className="flex flex-col px-4 pt-6" aria-label="Sections">
            {[...NAV, { href: "/create", label: "New file" }].map((n, i, arr) => (
              <Link
                key={n.href}
                href={n.href}
                className={`flex min-h-[56px] items-center gap-3 font-display text-[40px] font-extrabold uppercase leading-none text-paper hover:text-paper ${i < arr.length - 1 ? "border-b border-paper/[.18]" : ""}`}
              >
                <span className="sq" />
                <span>{n.label}</span>
              </Link>
            ))}
          </nav>
          <div className="mt-auto flex flex-col gap-[10px] px-4 pb-6 pt-4">
            {user ? (
              <>
                <Link href={`/user/${user.username}`} className="flex h-[52px] items-center justify-center gap-2 bg-blue font-display text-[22px] font-extrabold uppercase tracking-[0.14em] text-ink hover:text-ink">
                  <PersonIcon /> {user.username}
                </Link>
                <div className="flex justify-center gap-5 font-typed text-[12px] text-paper/60">
                  <Link href="/settings" className="text-paper underline hover:text-blue">Settings</Link>
                  {user.role === "admin" && <Link href="/admin" className="text-paper underline hover:text-blue">Admin</Link>}
                  <button type="button" onClick={handleSignOut} className="text-paper underline hover:text-blue">Sign out</button>
                </div>
              </>
            ) : (
              <>
                <Link href="/auth/signin" className="flex h-[52px] items-center justify-center bg-blue font-display text-[22px] font-extrabold uppercase tracking-[0.14em] text-ink hover:text-ink">Sign in</Link>
                <p className="text-center font-typed text-[12px] text-paper/60">
                  New here? <Link href="/auth/signin" className="text-paper underline hover:text-blue">Create an account</Link>
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
