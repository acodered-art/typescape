import Link from "next/link";
import { ProfileCard } from "@/components/profile-card";
import { EmptySlot, PageTitle, Sheet, Typed } from "@/components/dossier";

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
  const base = "http://localhost:3002";
  try {
    const res = await fetch(`${base}/api/collections/${slug}`, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

const count = (k: number, one: string, many = `${one}s`) => `${k} ${k === 1 ? one : many}`;

export default async function CollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const collection = await getCollection(slug);

  if (!collection) {
    return (
      <div className="pb-10">
        <PageTitle title="Collection" />
        <div className="max-w-[560px]">
          <Sheet className="flex flex-col gap-3">
            <div className="font-display text-[48px] font-extrabold uppercase leading-none">No such collection.</div>
            <Typed className="text-[14px]">
              It does not exist or was removed.{" "}
              <Link href="/collections" className="underline">Browse all collections</Link>.
            </Typed>
          </Sheet>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-10">
      <PageTitle
        title={collection.name}
        aside={
          <>
            {count(collection._count.items, "file")}, by{" "}
            <Link href={`/user/${collection.user.username}`} className="text-blue underline hover:text-paper">{collection.user.username}</Link>.
            {collection.isPublic ? " Public." : " Private."}
          </>
        }
      />
      {collection.description && <p className="-mt-2 max-w-[640px] pb-5 text-[15px] leading-[1.5] text-paper/75">{collection.description}</p>}

      <Sheet className="p-5">
        {collection.items.length === 0 ? (
          <EmptySlot>This collection is empty. Open a file and use the + Collection link on its card to add it here.</EmptySlot>
        ) : (
          <div className="grid gap-[14px] sm:grid-cols-2 lg:grid-cols-3">
            {collection.items.map((item) => (
              <div key={item.id} className="flex flex-col gap-2">
                <ProfileCard
                  name={item.profile.name}
                  slug={item.profile.slug}
                  imageUrl={item.profile.imageUrl}
                  description={item.profile.description}
                  category={item.profile.category}
                  typings={item.profile.typings}
                  variant="sheet"
                />
                {item.note && (
                  <Typed className="px-1 text-[12px] leading-[1.5]">
                    {item.adder.username} notes: {item.note}
                  </Typed>
                )}
              </div>
            ))}
          </div>
        )}
      </Sheet>
    </div>
  );
}
