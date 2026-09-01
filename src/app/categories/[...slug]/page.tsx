import { notFound } from "next/navigation";
import Link from "next/link";
import { ProfileCard } from "@/components/profile-card";

interface CategoryPageProps {
  params: Promise<{ slug: string[] }>;
}

async function getCategoryData(slug: string) {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  const [catRes, profilesRes] = await Promise.all([
    fetch(`${base}/api/categories?slug=${encodeURIComponent(slug)}`, { cache: "no-store" }),
    fetch(`${base}/api/profiles?category=${encodeURIComponent(slug)}&limit=30`, { cache: "no-store" }),
  ]);

  const category = catRes.ok ? await catRes.json() : null;
  const profiles = profilesRes.ok ? (await profilesRes.json()).profiles : [];

  return { category, profiles };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const slugPath = slug.join("/");
  const data = await getCategoryData(slugPath);

  if (!data.category) notFound();

  const cat = data.category;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#e8ecf4]">{cat.name}</h1>
        {cat.description && (
          <p className="text-sm text-[#7888a0] mt-1">{cat.description}</p>
        )}
        <span className="text-xs text-[#4a5a70]">{cat._count.profiles} profiles</span>
      </div>

      {/* Subcategories */}
      {cat.children?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {cat.children.map((child: { name: string; slug: string; _count: { profiles: number } }) => (
            <Link
              key={child.slug}
              href={`/categories/${child.slug}`}
              className="px-3 py-1.5 text-sm rounded border border-[#1a2234] bg-[#0e1420] hover:border-[#64ffda]/40 transition-colors"
            >
              {child.name}
              <span className="text-xs text-[#4a5a70] ml-1">({child._count.profiles})</span>
            </Link>
          ))}
        </div>
      )}

      {/* Profiles */}
      {data.profiles.length === 0 ? (
        <p className="text-sm text-[#4a5a70] italic">No profiles in this category yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {data.profiles.map((p: { name: string; slug: string; imageUrl: string | null; description: string | null; category: { name: string; slug: string } | null; typings: { typingSystem: { name: string; slug: string }; typeValue: string; confidence: number }[] }) => (
            <ProfileCard key={p.slug} {...p} />
          ))}
        </div>
      )}
    </div>
  );
}