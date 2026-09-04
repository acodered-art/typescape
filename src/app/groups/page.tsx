import Link from "next/link";
import { auth } from "@/lib/session";
import { EmptySlot, PageTitle, SectionHead, Sheet } from "@/components/dossier";
import { CreateGroupButton } from "./create-group-btn";

interface GroupData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  category: string;
  memberCount: number;
  postCount: number;
  createdAt: string;
  creator: { username: string };
}

const CATEGORY_LABELS: Record<string, string> = {
  fandom: "Fandom & Franchises",
  system: "Typing Systems",
  theory: "Theory & Debate",
  help: "Help & Requests",
};

async function getGroups() {
  const base = "http://localhost:3002";
  try {
    const res = await fetch(`${base}/api/groups`, { cache: "no-store" });
    if (res.ok) return res.json();
  } catch {}
  return [];
}

const count = (k: number, one: string, many = `${one}s`) => `${k} ${k === 1 ? one : many}`;

/** Groups: reading rooms, listed by category as row-fill rows on a sheet. Group icons are never printed. */
export default async function GroupsPage() {
  const groups = (await getGroups()) as GroupData[];
  const session = await auth();

  const byCategory = new Map<string, GroupData[]>();
  for (const g of groups) {
    const cat = g.category || "fandom";
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(g);
  }

  return (
    <div className="pb-10">
      <PageTitle title="Groups" aside={groups.length > 0 ? `${count(groups.length, "group")} on file` : "None on file yet"}>
        {session?.user && <CreateGroupButton />}
      </PageTitle>

      <Sheet className="flex flex-col gap-6">
        {groups.length === 0 ? (
          <EmptySlot>
            No groups yet.{" "}
            {session?.user ? "Open one with the button above." : (
              <>
                <Link href="/auth/signin" className="underline">Sign in</Link> to open one.
              </>
            )}
          </EmptySlot>
        ) : (
          Array.from(byCategory.entries()).map(([category, catGroups]) => (
            <section key={category} className="flex flex-col gap-2">
              <SectionHead size={20} title={CATEGORY_LABELS[category] || category} aside={count(catGroups.length, "group")} />
              {catGroups.map((g) => (
                <div key={g.id} className="row-fill flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
                  <div className="flex min-w-0 flex-col gap-1">
                    <Link href={`/groups/${g.slug}`} className="font-display text-[24px] font-extrabold uppercase leading-none text-ink hover:text-navy">
                      {g.name}
                    </Link>
                    {g.description && <p className="line-clamp-2 text-[14px] leading-[1.45]">{g.description}</p>}
                  </div>
                  <span className="shrink-0 font-typed text-[12px] text-navy">
                    {count(g.memberCount, "member")}, {count(g.postCount, "post")}
                  </span>
                </div>
              ))}
            </section>
          ))
        )}
      </Sheet>
    </div>
  );
}
