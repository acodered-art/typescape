import Link from "next/link";
import { auth } from "@/lib/session";
import { EmptySlot, PageTitle, Sheet, Typed } from "@/components/dossier";
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

const count = (k: number, one: string, many = `${one}s`) => `${k} ${k === 1 ? one : many}`;

/** Collections: readers' own drawers of files, three cards across on a sheet. */
export default async function CollectionsPage() {
  const collections = await getCollections();
  const session = await auth();

  return (
    <div className="pb-10">
      <PageTitle title="Collections" aside={collections.length > 0 ? `${count(collections.length, "collection")} on file` : "None on file yet"}>
        {session?.user && <CreateCollectionButton />}
      </PageTitle>

      <Sheet className="p-5">
        {collections.length === 0 ? (
          <EmptySlot>
            No collections yet.{" "}
            {session?.user ? "Start one with the button above." : (
              <>
                <Link href="/auth/signin" className="underline">Sign in</Link> to start one.
              </>
            )}
          </EmptySlot>
        ) : (
          <div className="grid gap-[14px] sm:grid-cols-2 lg:grid-cols-3">
            {collections.map((c) => (
              <div key={c.id} className="flex flex-col gap-1 border border-steel px-4 py-[14px]">
                <Link href={`/collections/${c.slug}`} className="font-display text-[26px] font-extrabold uppercase leading-[0.95] text-ink hover:text-navy">
                  {c.name}
                </Link>
                <Typed>
                  {count(c._count.items, "file")}. By{" "}
                  <Link href={`/user/${c.user.username}`} className="underline">{c.user.username}</Link>.
                </Typed>
                {c.description && <p className="line-clamp-2 text-[14px] leading-[1.45]">{c.description}</p>}
              </div>
            ))}
          </div>
        )}
      </Sheet>
    </div>
  );
}
