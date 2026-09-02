import Link from "next/link";
import { auth } from "@/lib/session";
import { CreateCollectionButton } from "./create-collection-btn";

interface CollectionListData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  user: { username: string };
  _count: { items: number };
}

async function getCollections(): Promise<CollectionListData[]> {
  const base = "http://localhost:3002";
  try {
    const res = await fetch(`${base}/api/collections`, { cache: "no-store" });
    if (res.ok) return res.json();
  } catch {}
  return [];
}

export default async function CollectionsPage() {
  const collections = await getCollections();
  const session = await auth();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#e8ecf4]">Collections</h1>
          <p className="text-sm text-[#7888a0] mt-1">
            User-created lists of profiles. {collections.length} collections total.
          </p>
        </div>
        {session?.user && <CreateCollectionButton />}
      </div>

      {collections.length === 0 ? (
        <div className="text-center py-12 text-[#4a5a70]">
          <p className="text-lg">No collections yet.</p>
          <p className="text-sm mt-1">Be the first to create one!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {collections.map((c) => (
            <Link
              key={c.id}
              href={`/collections/${c.slug}`}
              className="p-4 rounded-lg border border-[#1a2234] bg-[#0e1420] hover:border-[#2a3a4a] transition-colors"
            >
              <h3 className="font-medium text-sm text-[#c8d0dc]">{c.name}</h3>
              {c.description && (
                <p className="text-xs text-[#7888a0] mt-1 line-clamp-2">{c.description}</p>
              )}
              <div className="flex gap-2 text-xs text-[#4a5a70] mt-2">
                <span>{c._count.items} profiles</span>
                <span>by {c.user.username}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}