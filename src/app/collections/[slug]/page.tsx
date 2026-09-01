import Link from "next/link";
import { ProfileCard } from "@/components/profile-card";

interface CollectionData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isPublic: boolean;
  createdAt: string;
  user: { username: string };
  items: {
    id: string;
    note: string | null;
    sortOrder: number;
    profile: {
      name: string;
      slug: string;
      imageUrl: string | null;
      description: string | null;
      category: { name: string; slug: string } | null;
      typings: { typeValue: string; confidence: number; typingSystem: { name: string; slug: string } }[];
    };
    adder: { username: string };
  }[];
  _count: { items: number };
}

async function getCollection(slug: string): Promise<CollectionData | null> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  try {
    const res = await fetch(`${base}/api/collections/${slug}`, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function CollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const collection = await getCollection(slug);

  if (!collection) {
    return (
      <div className="text-center py-12">
        <h1 className="text-xl font-bold text-[#e8ecf4]">Collection not found</h1>
        <p className="text-sm text-[#4a5a70] mt-2">This collection doesn't exist or has been removed.</p>
        <Link href="/collections" className="inline-block mt-4 text-sm text-[#64ffda] hover:underline">
          Browse all collections
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#e8ecf4]">{collection.name}</h1>
        {collection.description && (
          <p className="text-sm text-[#7888a0] mt-1">{collection.description}</p>
        )}
        <div className="flex gap-3 text-xs text-[#4a5a70] mt-2">
          <span>by <Link href={`/user/${collection.user.username}`} className="text-[#64ffda] hover:underline">
            {collection.user.username}
          </Link></span>
          <span>{collection._count.items} profiles</span>
        </div>
      </div>

      {collection.items.length === 0 ? (
        <p className="text-sm text-[#4a5a70] italic">This collection is empty.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {collection.items.map((item) => (
            <div key={item.id} className="relative">
              <ProfileCard
                key={item.id}
                name={item.profile.name}
                slug={item.profile.slug}
                imageUrl={item.profile.imageUrl}
                description={item.profile.description}
                category={item.profile.category}
                typings={item.profile.typings}
              />
              {item.note && (
                <p className="text-xs text-[#4a5a70] mt-1 px-1 italic">"{item.note}"</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}