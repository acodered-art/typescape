import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { calcConsensus, calcVoteWeight } from "@/lib/utils";
import { prisma } from "@/lib/db";
import { FollowButton } from "@/components/follow-button";
import { SetOwnType } from "@/components/set-own-type";
import { Btn, CodeChip, EmptySlot, Field, FieldGrid, FolderTab, InkTag, OffTag, PaperClip, Portrait, Section, SectionHead, Sheet, Stamp, TabStrip, Typed, leadingRead } from "@/components/dossier";

interface UserData {
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  ownType: string | null;
  reputation: number;
  createdAt: string;
  _count: { profiles: number; typings: number; votes: number; comments: number; collections: number };
  typings: {
    typeValue: string;
    typingSystem: { name: string; slug: string };
    profile: { name: string; slug: string };
    createdAt: string;
  }[];
  collections: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    _count: { items: number };
  }[];
}

interface AchievementData {
  id: string;
  earnedAt: string;
  achievement: {
    slug: string;
    name: string;
    description: string;
    icon: string;
  };
}

async function getUser(username: string): Promise<{ user: UserData | null; achievements: AchievementData[] }> {
  const base = "http://localhost:3002";
  try {
    const [userRes, achRes] = await Promise.all([
      fetch(`${base}/api/user/${username}`, { cache: "no-store" }),
      fetch(`${base}/api/user/${username}/achievements`, { cache: "no-store" }),
    ]);
    const user = userRes.ok ? await userRes.json() : null;
    const achievements = achRes.ok ? await achRes.json() : [];
    return { user, achievements };
  } catch {
    return { user: null, achievements: [] };
  }
}

type ReadRow = UserData["typings"][number];

/** The reader's standing on the site. The user API does not send the role, so it is read straight from the database. */
async function readerRole(username: string): Promise<string> {
  try {
    return (await prisma.user.findUnique({ where: { username }, select: { role: true } }))?.role ?? "";
  } catch {
    return "";
  }
}

/** Each read set against its file's consensus, in the reader's row order: "With the consensus", "Against the consensus, INTJ 64%" (the leading read and its agreement), or "No consensus yet" while no read of that system on that file carries a vote. The user API carries no votes, so the files are read from the database; an unreachable database leaves the column empty. */
async function consensusLines(reads: ReadRow[]): Promise<(string | null)[]> {
  if (reads.length === 0) return [];
  try {
    const rows = await prisma.profileTyping.findMany({
      where: { profile: { slug: { in: [...new Set(reads.map((r) => r.profile.slug))] } } },
      select: { typeValue: true, profile: { select: { slug: true } }, typingSystem: { select: { slug: true } }, votes: { select: { voteValue: true, weight: true } } },
    });
    return reads.map((r) => {
      const lead = leadingRead(rows.filter((x) => x.profile.slug === r.profile.slug && x.typingSystem.slug === r.typingSystem.slug));
      if (!lead) return "No consensus yet";
      if (lead.typeValue === r.typeValue) return "With the consensus";
      return `Against the consensus, ${lead.typeValue} ${calcConsensus(lead.votes, 0).percentage}%`;
    });
  } catch {
    return reads.map(() => null);
  }
}

/** The signed-in reader's handle from the non-httpOnly user cookie, the same one the header reads. */
async function readerHandle(): Promise<string> {
  try {
    const raw = (await cookies()).get("user")?.value;
    if (!raw) return "";
    return (JSON.parse(decodeURIComponent(raw)) as { username?: string }).username ?? "";
  } catch {
    return "";
  }
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 14) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} ${months === 1 ? "month" : "months"} ago`;
  const years = Math.floor(days / 365);
  return `${years} ${years === 1 ? "year" : "years"} ago`;
}

const count = (k: number, one: string, many = `${one}s`) => `${k} ${k === 1 ? one : many}`;

/** What each achievement counts, in the file's words, and the reader's number for it. Tests and evidence are not on the user record. */
const UNITS: Record<string, { unit: string; of: (c: UserData["_count"]) => number }> = {
  votes_cast: { unit: "votes", of: (c) => c.votes },
  typings_submitted: { unit: "reads", of: (c) => c.typings },
  profiles_created: { unit: "files", of: (c) => c.profiles },
  comments_made: { unit: "notes", of: (c) => c.comments },
  collections_created: { unit: "collections", of: (c) => c.collections },
};

function nextAchievement(earned: Set<string>, counts: UserData["_count"]): string | null {
  let best: { name: string; threshold: number; unit: string; have: number } | null = null;
  for (const a of ACHIEVEMENTS) {
    if (earned.has(a.slug)) continue;
    const u = UNITS[a.criteria.type];
    if (!u) continue;
    const have = u.of(counts);
    const gap = a.criteria.threshold - have;
    if (gap <= 0) continue;
    if (!best || gap < best.threshold - best.have) best = { name: a.name, threshold: a.criteria.threshold, unit: u.unit, have };
  }
  return best ? `Next: ${best.name} at ${best.threshold} ${best.unit}, ${best.have} filed.` : null;
}

export default async function UserPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const [{ user, achievements }, me, role] = await Promise.all([getUser(username), readerHandle(), readerRole(username)]);

  if (!user) notFound();

  const consensus = await consensusLines(user.typings);

  const isMe = me !== "" && me === user.username;
  const earned = new Set(achievements.map((a) => a.achievement.slug));
  const since = new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const ownCode = user.ownType ? user.ownType.split(":")[1] || user.ownType : null;
  const next = nextAchievement(earned, user._count);
  const record = `${count(user._count.profiles, "file")}, ${count(user._count.typings, "read")}, ${count(user._count.votes, "vote")}, ${count(user._count.comments, "note")}`;

  const stampBlock = ownCode ? (
    <>
      <Stamp code={ownCode} line="SELF-REPORTED" className="right-10 top-[34px] hidden md:flex" />
      <div className="flex md:hidden">
        <Stamp code={ownCode} line="SELF-REPORTED" size="sm" className="relative left-0 top-0" />
      </div>
    </>
  ) : isMe ? (
    <EmptySlot label="Self-reported type" className="md:absolute md:right-10 md:top-[34px] md:w-[240px]">
      No self-reported type on this file yet. Set my type below.
    </EmptySlot>
  ) : null;

  return (
    <div className="flex flex-col gap-10 pb-10">
      <div>
        <TabStrip>
          <FolderTab active>Reader file</FolderTab>
        </TabStrip>
        <Sheet punched className="flex flex-col gap-[22px]">
          <div className="relative flex flex-col gap-5 md:flex-row md:items-start md:gap-7">
            <div className="relative shrink-0 self-start">
              <Portrait src={user.avatarUrl} alt={user.username} w={150} h={180} className="max-md:h-[120px]! max-md:w-[100px]!" />
              <PaperClip className="left-[14px] top-[-14px]" />
              <span className="pointer-events-none absolute -left-px -top-px h-[10px] w-[10px] border-l-2 border-t-2 border-blue" aria-hidden="true" />
              <span className="pointer-events-none absolute -bottom-px -right-px h-[10px] w-[10px] border-b-2 border-r-2 border-blue" aria-hidden="true" />
            </div>
            <FieldGrid className="min-w-0 flex-1 md:pr-[250px]">
              <div className="lab">Reader</div>
              <h1 className="flex flex-wrap items-baseline gap-3 font-display text-[40px] font-extrabold uppercase leading-[0.95] tracking-[0.01em] md:text-[64px]">
                {user.username}
                {role && role !== "user" && <InkTag className="text-[12px]">{role}</InkTag>}
              </h1>
              <Field label="Since">{since}</Field>
              <Field label="Standing">
                {user.reputation} reputation, reads count {calcVoteWeight(user.reputation).toFixed(1)} times
              </Field>
              <Field label="Record">{record}</Field>
              <Field label="Notes" ruled={Boolean(user.bio)}>
                {user.bio || "No notes yet."}
              </Field>
            </FieldGrid>
            {stampBlock}
          </div>

          <Section>
            <SectionHead
              title="Achievements"
              aside={
                <>
                  {earned.size} of {ACHIEVEMENTS.length}.{next ? ` ${next}` : ""}
                </>
              }
            />
            <div className="flex flex-wrap gap-x-[14px] gap-y-3 pt-1">
              {ACHIEVEMENTS.filter((a) => earned.has(a.slug)).map((a, i) => (
                <InkTag key={a.slug} rotate={[-3, 2, -1, 3, -2][i % 5]} className="px-2 py-1">
                  <span title={a.description}>{a.name}</span>
                </InkTag>
              ))}
              {ACHIEVEMENTS.filter((a) => !earned.has(a.slug)).map((a) => (
                <OffTag key={a.slug} className="uppercase">
                  <span title={a.description}>{a.name}</span>
                </OffTag>
              ))}
            </div>
          </Section>

          <Section>
            <SectionHead title="Recent reads" aside={user._count.typings > 0 ? `${user._count.typings} on file` : "None on file"} />
            {user.typings.length === 0 ? (
              <Typed className="text-[14px]">{isMe ? "You have not read a character yet. Open a file and add your read." : "No reads on file yet."}</Typed>
            ) : (
              <div className="flex flex-col">
                {user.typings.map((t, i) => (
                  <div key={t.profile.slug + t.typingSystem.slug + t.typeValue + t.createdAt} className={`grid items-center gap-x-4 gap-y-1 py-[9px] md:grid-cols-[250px_190px_minmax(0,1fr)_110px] ${i < user.typings.length - 1 ? "border-b border-paper-2" : ""}`}>
                    <Link href={`/profiles/${t.profile.slug}`} className="truncate font-display text-[22px] font-extrabold uppercase leading-none text-ink hover:text-navy">
                      {t.profile.name}
                    </Link>
                    <div className="flex items-center gap-2">
                      <CodeChip tone="navy" href={`/search?type=${encodeURIComponent(t.typeValue)}&system=${t.typingSystem.slug}`}>{t.typeValue}</CodeChip>
                      <Typed>{t.typingSystem.name}</Typed>
                    </div>
                    {consensus[i] ? <Typed>{consensus[i]}</Typed> : <span className="hidden md:block" />}
                    <span className="font-typed text-[12px] text-steel-2 md:text-right">{timeAgo(t.createdAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section>
            <SectionHead title="Collections" aside={user._count.collections > 0 ? count(user._count.collections, "collection") : "None yet"} />
            {user.collections.length === 0 ? (
              <Typed className="text-[14px]">
                {isMe ? (
                  <>
                    No collections yet. <Link href="/collections" className="underline">Start one</Link>.
                  </>
                ) : (
                  "No collections on file."
                )}
              </Typed>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {user.collections.map((c) => (
                  <Link key={c.id} href={`/collections/${c.slug}`} className="flex flex-col gap-1 border border-steel px-4 py-[14px] text-ink hover:border-blue">
                    <span className="font-display text-[26px] font-extrabold uppercase leading-[0.95]">{c.name}</span>
                    <Typed>{count(c._count.items, "file")}.{c.description ? ` ${c.description}` : ""}</Typed>
                  </Link>
                ))}
              </div>
            )}
          </Section>

          <div className="flex flex-col-reverse gap-3 border-t-2 border-ink pt-[18px] sm:flex-row sm:items-center sm:justify-between">
            {isMe ? (
              <>
                <Typed>Your file, as other readers see it.</Typed>
                <div className="flex flex-col-reverse gap-3 sm:flex-row">
                  <SetOwnType username={user.username} currentType={user.ownType || undefined} />
                  <Btn variant="primary" href="/settings">Edit file</Btn>
                </div>
              </>
            ) : (
              <>
                <span />
                <FollowButton username={user.username} />
              </>
            )}
          </div>
        </Sheet>
      </div>
    </div>
  );
}
