import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { calcConsensus } from "@/lib/utils";
import { auth } from "@/lib/session";
import { FindingsRail, VotePanel, type TypingRead } from "@/components/vote-panel";
import { CommentSection } from "@/components/comment-section";
import { EvidencePanel } from "@/components/evidence-panel";
import { AddToCollectionInline } from "@/components/add-to-collection";
import { UploadImageButton } from "@/components/upload-image";
import { AddTypingForm } from "@/components/add-typing";
import { ProfileCard } from "@/components/profile-card";
import { TraitVotePanel } from "@/components/trait-vote-panel";
import { Field, FieldGrid, PaperClip, Portrait, Section, SectionHead, Stamp, Typed, bySystemOrder, leadingRead } from "@/components/dossier";
import { ProfileTabs, TabLink, type ProfileTab } from "./profile-tabs";

const PROFILE_TABS: ProfileTab[] = ["subject", "findings", "evidence", "discussion"];

interface ProfilePageData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  bio: string | null;
  externalIds: Record<string, string> | null;
  metadata: Record<string, string> | null;
  viewCount: number;
  createdAt: string;
  category: { id: string; name: string; slug: string } | null;
  typings: (TypingRead & {
    confidence: number;
    details: unknown;
    evidenceUrls: string[];
    isCommunity: boolean;
    typingSystem: { id: string; name: string; slug: string };
  })[];
  _count: { comments: number };
}

type RelatedProfile = { name: string; slug: string; imageUrl: string | null; description: string | null; category: { name: string; slug: string } | null; typings: { typingSystem: { name: string; slug: string }; typeValue: string; confidence: number }[] };
type CategoryNode = { name: string; slug: string; children: { name: string; slug: string }[] };

async function getProfile(slug: string): Promise<ProfilePageData | null> {
  const base = "http://localhost:3002";
  try {
    const res = await fetch(`${base}/api/profiles/${slug}`, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function getJson<T>(url: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

/** How many exhibits are filed on this character's reads (the profile API carries no evidence count). */
async function countEvidence(profileId: string): Promise<number | null> {
  try {
    return await prisma.evidence.count({ where: { profileTyping: { profileId } } });
  } catch {
    return null;
  }
}

/** The signed-in reader's own vote on each of this file's reads, so the agree and disagree buttons open in the right state (the profile API does not say which vote is yours). */
async function myVotes(profileId: string): Promise<Record<string, 1 | -1>> {
  try {
    const session = await auth();
    if (!session?.user) return {};
    const votes = await prisma.vote.findMany({ where: { userId: session.user.id, profileTyping: { profileId } }, select: { profileTypingId: true, voteValue: true } });
    return Object.fromEntries(votes.map((v) => [v.profileTypingId, v.voteValue > 0 ? 1 : -1]));
  } catch {
    return {};
  }
}

/** "Naruto, filed under Anime & Manga" from the category tree; a top-level category is just its name. */
function sourceLine(category: { name: string; slug: string } | null, tree: CategoryNode[]): string | null {
  if (!category) return null;
  const parent = tree.find((c) => c.children.some((ch) => ch.slug === category.slug));
  return parent ? `${category.name}, filed under ${parent.name}` : category.name;
}

const count = (k: number, one: string, many = `${one}s`) => `${k} ${k === 1 ? one : many}`;

/** The consensus stamp: the leading read of the first system (in the site's order) that has any votes. */
function pickStamp(typings: TypingRead[]): { code: string; line: string } | null {
  const seen = new Set<string>();
  for (const t of typings) seen.add(t.typingSystem.slug);
  for (const slug of seen) {
    const lead = leadingRead(typings.filter((t) => t.typingSystem.slug === slug));
    if (!lead) continue;
    const pct = calcConsensus(lead.votes, 0).percentage;
    return { code: lead.typeValue, line: `${count(lead.votes.length, "reader").toUpperCase()}, ${pct}% AGREE` };
  }
  return null;
}

export default async function ProfilePage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const tabParam = typeof sp.tab === "string" ? sp.tab : sp.tab?.[0];
  const initialTab: ProfileTab = PROFILE_TABS.includes(tabParam as ProfileTab) ? (tabParam as ProfileTab) : "subject";

  const profile = await getProfile(slug);
  if (!profile) notFound();

  const base = "http://localhost:3002";
  const [related, tree, evidenceCount, mine] = await Promise.all([
    getJson<RelatedProfile[]>(`${base}/api/profiles/${slug}/related`, []),
    getJson<CategoryNode[]>(`${base}/api/categories`, []),
    countEvidence(profile.id),
    myVotes(profile.id),
  ]);

  const typings = bySystemOrder(profile.typings);
  const systems = new Set(typings.map((t) => t.typingSystem.slug));
  const stamp = pickStamp(typings);
  const reads = typings.reduce((sum, t) => sum + t.votes.length, 0);
  const source = sourceLine(profile.category, tree);
  const links = profile.externalIds ? Object.entries(profile.externalIds) : [];

  const labels: Record<ProfileTab, string> = {
    subject: "Subject",
    findings: "Findings",
    evidence: evidenceCount === null ? "Evidence" : `Evidence (${evidenceCount})`,
    discussion: `Discussion (${profile._count.comments})`,
  };

  const viewsBlock = (
    <div className="font-typed text-[12px] leading-[1.7] text-navy md:text-right">
      {profile.viewCount.toLocaleString()} views
      <br />
      {count(typings.length, "finding")}
      {reads > 0 && (
        <>
          <br />
          {count(reads, "read")}
        </>
      )}
    </div>
  );

  const portrait = (
    <div className="relative shrink-0">
      <Portrait src={profile.imageUrl} alt={profile.name} w={150} h={180} className="max-md:h-[120px]! max-md:w-[100px]!" />
      <PaperClip className="left-[14px] top-[-14px]" />
      <span className="pointer-events-none absolute -left-px -top-px h-[10px] w-[10px] border-l-2 border-t-2 border-blue" aria-hidden="true" />
      <span className="pointer-events-none absolute -bottom-px -right-px h-[10px] w-[10px] border-b-2 border-r-2 border-blue" aria-hidden="true" />
      <UploadImageButton profileSlug={profile.slug} currentImage={profile.imageUrl} />
    </div>
  );

  /** The compact subject strip at the top of the Evidence and Discussion tabs. */
  const strip = (
    <div className="flex items-center gap-4 border-b-2 border-ink pb-4">
      <Portrait src={profile.imageUrl} alt="" />
      <div className="min-w-0">
        <div className="truncate font-display text-[32px] font-extrabold uppercase leading-none md:text-[40px]">{profile.name}</div>
        {source && <Typed>{source}</Typed>}
      </div>
    </div>
  );

  const subject = (
    <>
      <div className="relative flex flex-col gap-5 md:flex-row md:items-start md:gap-7">
        <div className="flex gap-4 md:contents">
          {portrait}
          <FieldGrid className="min-w-0 flex-1 max-md:grid-cols-[minmax(0,1fr)] md:pr-[250px]">
            <div className="lab max-md:hidden">Subject</div>
            <h1 className="font-display text-[40px] font-extrabold uppercase leading-[0.95] tracking-[0.01em] md:text-[64px]">{profile.name}</h1>
            {source && (
              <>
                <div className="lab max-md:hidden">Source</div>
                <div className="ln text-[16px] max-md:border-0 max-md:text-[14px] max-md:text-navy">{source}</div>
              </>
            )}
            {profile.description && (
              <>
                <div className="lab max-md:hidden">Summary</div>
                <div className="ln text-[16px] max-md:border-0 max-md:text-[14px]">{profile.description}</div>
              </>
            )}
          </FieldGrid>
        </div>
        {(profile.bio || links.length > 0) && (
          <FieldGrid className="md:hidden">
            {profile.bio && <Field label="Notes" ruled>{profile.bio}</Field>}
            {links.length > 0 && <Field label="Links">{links.map(([k, v], i) => <span key={k}>{i > 0 && ", "}<a href={v} target="_blank" rel="noopener noreferrer" className="underline">{k}</a></span>)}</Field>}
          </FieldGrid>
        )}
        {/* phones: the stamp lands under the fields, beside the counts */}
        <div className="flex items-center justify-between gap-4 md:hidden">
          {stamp ? (
            <Stamp code={stamp.code} line={stamp.line} size="sm" className="relative left-0 top-0" />
          ) : (
            <div className="dashed px-3 py-2 font-typed text-[12px] text-steel-2">No reads yet</div>
          )}
          {viewsBlock}
        </div>
        {stamp ? (
          <Stamp code={stamp.code} line={stamp.line} className="right-10 top-[34px] hidden md:flex" />
        ) : (
          <div className="dashed absolute right-10 top-[34px] hidden w-[220px] flex-col gap-1 px-4 py-3 md:flex">
            <span className="lab text-steel-2">Consensus</span>
            <Typed>No reads yet. The first read stamps this file.</Typed>
          </div>
        )}
        <div className="absolute right-11 top-[192px] hidden md:block">{viewsBlock}</div>
      </div>
      {(profile.bio || links.length > 0) && (
        <FieldGrid className="hidden md:grid md:pl-[178px]">
          {profile.bio && <Field label="Notes" ruled>{profile.bio}</Field>}
          {links.length > 0 && (
            <Field label="Links">
              {links.map(([k, v], i) => (
                <span key={k}>
                  {i > 0 && ", "}
                  <a href={v} target="_blank" rel="noopener noreferrer" className="underline">{k}</a>
                </span>
              ))}
            </Field>
          )}
        </FieldGrid>
      )}

      <Section>
        <SectionHead
          title="Findings"
          aside={
            <>
              {systems.size} of 20 systems on file
              <TabLink to="findings" className="ml-4 text-blue underline hover:text-navy">Open all</TabLink>
            </>
          }
        />
        <VotePanel profileSlug={profile.slug} initial={typings} initialMine={mine} mode="summary" />
      </Section>

      <TraitVotePanel profileSlug={profile.slug} />

      <div className="flex flex-col-reverse gap-3 border-t-2 border-ink pt-[18px] sm:flex-row sm:justify-end">
        <TabLink to="evidence" className="btn">Submit evidence</TabLink>
        <AddTypingForm profileSlug={profile.slug} />
      </div>
    </>
  );

  const findings = (
    <>
      <SectionHead title="Findings" aside={`${systems.size} of 20 systems on file`} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Typed className="text-[14px]">Every read on this file, by system. Agree or disagree with each one; five readers certify a finding.</Typed>
        <AddTypingForm profileSlug={profile.slug} variant="secondary" />
      </div>
      <VotePanel profileSlug={profile.slug} initial={typings} initialMine={mine} mode="full" />
    </>
  );

  const evidence = (
    <>
      {strip}
      {typings.length === 0 ? (
        <Typed className="text-[14px]">No reads on this file yet, so nothing to file evidence against. Add your read first.</Typed>
      ) : (
        typings.map((t) => <EvidencePanel key={t.id} typingId={t.id} code={t.typeValue} systemName={t.typingSystem.name} subject={profile.name} certified={t.votes.length >= 5} />)
      )}
    </>
  );

  const discussion = (
    <>
      {strip}
      <div className="grid gap-9 md:grid-cols-[minmax(0,1fr)_260px]">
        <CommentSection profileSlug={profile.slug} />
        {typings.length > 0 && (
          <FindingsRail typings={typings}>
            <TabLink to="findings" className="self-start font-typed text-[13px] text-blue underline hover:text-navy">Open the Findings tab</TabLink>
          </FindingsRail>
        )}
      </div>
    </>
  );

  return (
    <div className="flex flex-col gap-10 pb-10">
      <div>
        <ProfileTabs initial={initialTab} labels={labels} panels={{ subject, findings, evidence, discussion }} />
      </div>

      <div className="flex justify-end">
        <AddToCollectionInline profileSlug={profile.slug} desk />
      </div>

      {related.length > 0 && (
        <section className="flex flex-col gap-[14px]">
          <SectionHead title="Related files" />
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {related.map((p) => (
              <ProfileCard key={p.slug} name={p.name} slug={p.slug} imageUrl={p.imageUrl} description={p.description} category={p.category} typings={p.typings} variant="desk" />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
