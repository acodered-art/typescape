import { notFound } from "next/navigation";
import Link from "next/link";
import { PageTitle } from "@/components/dossier";
import { Cabinet, FileSheet, ShowMore, SortTabs, type BrowseProfile } from "@/app/search/browse-parts";

interface CategoryPageProps {
  params: Promise<{ slug: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

type Category = {
  name: string;
  slug: string;
  description: string | null;
  _count: { profiles: number };
  children?: { name: string; slug: string; _count: { profiles: number } }[];
};

async function getCategoryData(slug: string, sort: string) {
  const base = "http://localhost:3002";

  const [catRes, profilesRes] = await Promise.all([
    fetch(`${base}/api/categories?slug=${encodeURIComponent(slug)}`, { cache: "no-store" }),
    fetch(`${base}/api/profiles?category=${encodeURIComponent(slug)}&limit=30&sort=${encodeURIComponent(sort)}`, { cache: "no-store" }),
  ]);

  const category: Category | null = catRes.ok ? await catRes.json() : null;
  const data = profilesRes.ok ? await profilesRes.json() : { profiles: [], total: 0 };

  return { category, profiles: (data.profiles || []) as BrowseProfile[], total: (data.total || 0) as number };
}

const count = (k: number, one: string, many = `${one}s`) => `${k} ${k === 1 ? one : many}`;

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { slug } = await params;
  const sp = await searchParams;
  const sort = (typeof sp.sort === "string" ? sp.sort : sp.sort?.[0]) || "views";
  const slugPath = slug.join("/");
  const data = await getCategoryData(slugPath, sort);

  if (!data.category) notFound();

  const cat = data.category;
  const children = cat.children ?? [];
  const here = `/categories/${slugPath}`;
  const childFiles = children.reduce((sum, c) => sum + c._count.profiles, 0);
  const aside = data.total > 0 ? `${count(data.total, "file")} in this drawer` : childFiles > 0 ? `${count(childFiles, "file")} in ${count(children.length, "drawer")}` : "No files in this drawer yet";

  return (
    <div>
      <PageTitle title={cat.name} aside={`${aside}${cat.description ? `. ${cat.description}` : ""}`} />
      <div className="grid gap-7 md:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="flex flex-col gap-[22px]">
          <Cabinet
            all={{ href: "/search", label: "All files", active: false }}
            rows={[
              { href: here, label: cat.name, count: data.total + childFiles, active: true },
              ...children.map((child) => ({ href: `/categories/${child.slug}`, label: child.name, count: child._count.profiles, active: false })),
            ]}
            moreAfter={12}
          />
        </aside>

        <div className="flex min-w-0 flex-col">
          <SortTabs sort={sort} hrefFor={(key) => `${here}?sort=${key}`} newHref="/create" />
          <FileSheet
            profiles={data.profiles}
            empty={
              childFiles > 0 ? (
                <>This drawer is split into {count(children.length, "sub-drawer")}. Open one from the cabinet.</>
              ) : (
                <>
                  No file in this drawer yet.{" "}
                  <Link href="/create" className="underline">
                    Open the first one
                  </Link>
                  .
                </>
              )
            }
          />
          {data.total > data.profiles.length && <ShowMore href={`/search?category=${encodeURIComponent(slugPath)}&sort=${sort}&limit=60`} n={data.total - data.profiles.length} />}
        </div>
      </div>
    </div>
  );
}
