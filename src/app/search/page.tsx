import Link from "next/link";
import { ProfileCard } from "@/components/profile-card";
import { SearchFilters } from "./search-filters";

interface SearchPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

interface FacetData {
  total: number;
  categories: { slug: string; name: string; count: number }[];
  types: { typeValue: string; systemSlug: string; systemName: string; count: number }[];
}

async function getData(params: Record<string, string>, base: string) {
  const profileParams = new URLSearchParams(params);
  profileParams.set("limit", "30");

  const [profilesRes, facetsRes] = await Promise.all([
    fetch(`${base}/api/profiles?${profileParams.toString()}`, { cache: "no-store" }).catch(() => null),
    fetch(`${base}/api/facets?q=${encodeURIComponent(params.q || "")}`, { cache: "no-store" }).catch(() => null),
  ]);

  const profiles = profilesRes?.ok ? await profilesRes.json() : { profiles: [], total: 0 };
  const facets = facetsRes?.ok ? await facetsRes.json() : { total: 0, categories: [], types: [] };

  return { profiles: profiles.profiles, total: profiles.total, facets };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const sp = await searchParams;
  const q = (typeof sp.q === "string" ? sp.q : sp.q?.[0]) || "";
  const type = (typeof sp.type === "string" ? sp.type : sp.type?.[0]) || "";
  const types = (typeof sp.types === "string" ? sp.types : sp.types?.[0]) || "";
  const system = (typeof sp.system === "string" ? sp.system : sp.system?.[0]) || "";
  const category = (typeof sp.category === "string" ? sp.category : sp.category?.[0]) || "";
  const sort = (typeof sp.sort === "string" ? sp.sort : sp.sort?.[0]) || "views";

  // Build params for API call
  const params: Record<string, string> = {};
  if (q) params.q = q;
  if (type) params.type = type;
  if (types) params.types = types;
  if (system) params.system = system;
  if (category) params.category = category;
  if (sort) params.sort = sort;

  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const { profiles, total, facets } = await getData(params, base);

  // Build active filter chips
  const activeFilters: { label: string; href: string }[] = [];
  if (q) activeFilters.push({ label: `"${q}"`, href: removeParam("q") });
  if (type) activeFilters.push({ label: `${type}`, href: removeParam("type") });
  if (types) {
    types.split(",").forEach((t) => {
      const remaining = types.split(",").filter((x) => x !== t).join(",");
      activeFilters.push({ label: t, href: remaining ? setParam("types", remaining) : removeParam("types") });
    });
  }
  if (category) activeFilters.push({ label: `Category: ${category}`, href: removeParam("category") });
  if (system) activeFilters.push({ label: `System: ${system}`, href: removeParam("system") });

  function removeParam(key: string) {
    const p = new URLSearchParams(params);
    p.delete(key);
    return `/search?${p.toString()}`;
  }
  function setParam(key: string, val: string) {
    const p = new URLSearchParams(params);
    p.set(key, val);
    return `/search?${p.toString()}`;
  }

  return (
    <div className="flex gap-6">
      {/* Sidebar Filters */}
      <aside className="hidden lg:block w-60 shrink-0 space-y-6">
        <SearchFilters
          currentQ={q}
          currentCategory={category}
          currentType={type}
          currentTypes={types}
          currentSystem={system}
          currentSort={sort}
          facets={facets}
        />
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-xl font-bold text-[#e8ecf4]">
            {q ? `"${q}"` : "Browse Profiles"}
          </h1>
          <span className="text-sm text-[#4a5a70]">{total.toLocaleString()} results</span>
        </div>

        {/* Sort Bar */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[#4a5a70]">Sort by:</span>
          {["views", "recent", "name"].map((s) => (
            <Link
              key={s}
              href={setParam("sort", s)}
              className={`px-2 py-1 rounded transition-colors ${
                sort === s
                  ? "bg-[#64ffda]/20 text-[#64ffda]"
                  : "text-[#7888a0] hover:text-[#c8d0dc]"
              }`}
            >
              {s === "views" ? "Most Viewed" : s === "recent" ? "Newest" : "Name"}
            </Link>
          ))}
        </div>

        {/* Active Filters */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {activeFilters.map((f) => (
              <Link
                key={f.label}
                href={f.href}
                className="flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-[#64ffda]/10 text-[#64ffda] border border-[#64ffda]/20 hover:bg-[#64ffda]/20 transition-colors"
              >
                {f.label}
                <span className="ml-0.5">×</span>
              </Link>
            ))}
          </div>
        )}

        {/* Mobile Filter Toggle */}
        <details className="lg:hidden">
          <summary className="text-sm text-[#64ffda] cursor-pointer">Filters</summary>
          <div className="mt-3">
            <SearchFilters
              currentQ={q}
              currentCategory={category}
              currentType={type}
              currentTypes={types}
              currentSystem={system}
              currentSort={sort}
              facets={facets}
            />
          </div>
        </details>

        {/* Results */}
        {profiles.length === 0 ? (
          <div className="text-center py-12 text-[#4a5a70]">
            <p className="text-lg">No profiles found.</p>
            <p className="text-sm mt-1">Try different filters or be the first to create one.</p>
            <Link
              href={`/create${q ? `?name=${encodeURIComponent(q)}` : ""}`}
              className="inline-block mt-4 px-4 py-2 text-sm rounded bg-[#64ffda]/10 text-[#64ffda] border border-[#64ffda]/20 hover:bg-[#64ffda]/20 transition-colors"
            >
              {q ? `Add "${q}"` : "Add a Profile"}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {profiles.map((p: { name: string; slug: string; imageUrl: string | null; description: string | null; category: { name: string; slug: string } | null; typings: { typingSystem: { name: string; slug: string }; typeValue: string; confidence: number }[] }) => (
              <ProfileCard key={p.slug} {...p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}