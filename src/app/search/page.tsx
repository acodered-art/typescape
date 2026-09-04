import Link from "next/link";
import { TYPING_SYSTEMS } from "@/lib/typing-systems";
import { PageTitle } from "@/components/dossier";
import { SearchFilters } from "./search-filters";
import { FileSheet, ShowMore, SortTabs, ThisSearch, type BrowseProfile, type FacetType } from "./browse-parts";

interface SearchPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

interface FacetData {
  total: number;
  categories: { slug: string; name: string; count: number }[];
  types: FacetType[];
}

const PAGE = 30;
const MAX_LIMIT = 120;

async function getData(params: Record<string, string>, limit: number, base: string) {
  const profileParams = new URLSearchParams(params);
  profileParams.set("limit", String(limit));

  const [profilesRes, facetsRes] = await Promise.all([
    fetch(`${base}/api/profiles?${profileParams.toString()}`, { cache: "no-store" }).catch(() => null),
    fetch(`${base}/api/facets?q=${encodeURIComponent(params.q || "")}`, { cache: "no-store" }).catch(() => null),
  ]);

  const profiles = profilesRes?.ok ? await profilesRes.json() : { profiles: [], total: 0 };
  const facets: FacetData = facetsRes?.ok ? await facetsRes.json() : { total: 0, categories: [], types: [] };

  return { profiles: (profiles.profiles || []) as BrowseProfile[], total: (profiles.total || 0) as number, facets };
}

const count = (k: number, one: string, many = `${one}s`) => `${k} ${k === 1 ? one : many}`;

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const sp = await searchParams;
  const q = (typeof sp.q === "string" ? sp.q : sp.q?.[0]) || "";
  const type = (typeof sp.type === "string" ? sp.type : sp.type?.[0]) || "";
  const types = (typeof sp.types === "string" ? sp.types : sp.types?.[0]) || "";
  const system = (typeof sp.system === "string" ? sp.system : sp.system?.[0]) || "";
  const category = (typeof sp.category === "string" ? sp.category : sp.category?.[0]) || "";
  const sort = (typeof sp.sort === "string" ? sp.sort : sp.sort?.[0]) || "views";
  const limitRaw = Number(typeof sp.limit === "string" ? sp.limit : sp.limit?.[0]);
  const limit = Math.min(MAX_LIMIT, Math.max(PAGE, Number.isFinite(limitRaw) ? limitRaw : PAGE));

  // Build params for API call
  const params: Record<string, string> = {};
  if (q) params.q = q;
  if (type) params.type = type;
  if (types) params.types = types;
  if (system) params.system = system;
  if (category) params.category = category;
  if (sort) params.sort = sort;

  const base = "http://localhost:3002";
  const { profiles, total, facets } = await getData(params, limit, base);

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

  // The current search as removable chips
  const activeFilters: { label: string; href: string }[] = [];
  if (q) activeFilters.push({ label: `"${q}"`, href: removeParam("q") });
  if (type) activeFilters.push({ label: type, href: removeParam("type") });
  if (types) {
    types.split(",").forEach((t) => {
      const remaining = types.split(",").filter((x) => x !== t).join(",");
      activeFilters.push({ label: t, href: remaining ? setParam("types", remaining) : removeParam("types") });
    });
  }
  if (category) activeFilters.push({ label: facets.categories.find((c) => c.slug === category)?.name ?? category, href: removeParam("category") });
  if (system) activeFilters.push({ label: TYPING_SYSTEMS.find((s) => s.slug === system)?.name ?? system, href: removeParam("system") });

  const newHref = `/create${q ? `?name=${encodeURIComponent(q)}` : ""}`;
  const aside =
    total === 0 ? (q ? `No file matches "${q}"` : "No files on record") : profiles.length >= total ? `${count(total, "file")}, showing all` : `${count(total, "file")}, showing ${profiles.length}`;

  return (
    <div>
      <PageTitle title="Browse the files" aside={aside} />
      <div className="grid gap-7 md:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="flex flex-col gap-[22px]">
          <ThisSearch filters={activeFilters} />
          <SearchFilters currentQ={q} currentCategory={category} currentType={type} currentTypes={types} currentSystem={system} currentSort={sort} facets={facets} />
        </aside>

        <div className="flex min-w-0 flex-col">
          <SortTabs sort={sort} hrefFor={(key) => setParam("sort", key)} newHref={newHref} />
          <FileSheet
            profiles={profiles}
            empty={
              <>
                No file matches that.{" "}
                <Link href={newHref} className="underline">
                  Open a new file{q ? ` for "${q}"` : ""}
                </Link>
                .
              </>
            }
          />
          {total > profiles.length && <ShowMore href={setParam("limit", String(Math.min(MAX_LIMIT, limit + PAGE)))} n={Math.min(PAGE, total - profiles.length)} />}
        </div>
      </div>
    </div>
  );
}
