import { notFound } from "next/navigation";
import Link from "next/link";
import { VotePanel } from "@/components/vote-panel";
import { CommentSection } from "@/components/comment-section";
import { AddToCollectionInline } from "@/components/add-to-collection";
import { UploadImageButton } from "@/components/upload-image";
import { AddTypingForm } from "@/components/add-typing";
import { ProfileCard } from "@/components/profile-card";
import { DisorderVotePanel } from "@/components/disorder-vote-panel";
import { TraitVotePanel } from "@/components/trait-vote-panel";

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
  typings: {
    id: string;
    typeValue: string;
    confidence: number;
    details: unknown;
    evidenceUrls: string[];
    isCommunity: boolean;
    typingSystem: { id: string; name: string; slug: string };
    votes: { voteValue: number; weight: number }[];
    creator: { username: string } | null;
  }[];
  _count: { comments: number };
}

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

export default async function ProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const profile = await getProfile(slug);

  if (!profile) notFound();

  // Fetch related profiles
  const base = "http://localhost:3002";
  let related: { name: string; slug: string; imageUrl: string | null; description: string | null; category: { name: string; slug: string } | null; typings: { typingSystem: { name: string; slug: string }; typeValue: string; confidence: number }[] }[] = [];
  try {
    const relRes = await fetch(`${base}/api/profiles/${slug}/related`, { cache: "no-store" });
    if (relRes.ok) related = await relRes.json();
  } catch {}

  // Group typings by system
  const bySystem = new Map<string, typeof profile.typings>();
  for (const t of profile.typings) {
    const key = t.typingSystem.slug;
    if (!bySystem.has(key)) bySystem.set(key, []);
    bySystem.get(key)!.push(t);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex gap-4 items-start">
        <div className="relative w-24 h-24 rounded-lg overflow-hidden shrink-0 bg-[#1a2234]">
          {profile.imageUrl ? (
            <img src={profile.imageUrl} alt={profile.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-[#4a5a70]">
              {profile.name.charAt(0).toUpperCase()}
            </div>
          )}
          <UploadImageButton profileSlug={profile.slug} currentImage={profile.imageUrl} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#e8ecf4]">{profile.name}</h1>
          </div>
          {profile.category && (
            <Link
              href={`/categories/${profile.category.slug}`}
              className="text-sm text-[#64ffda] hover:underline"
            >
              {profile.category.name}
            </Link>
          )}
          {profile.description && (
            <p className="text-sm text-[#7888a0] mt-1">{profile.description}</p>
          )}
          <div className="flex gap-3 text-xs text-[#4a5a70] mt-2">
            <span>{profile.viewCount.toLocaleString()} views</span>
            <span>{profile._count.comments} comments</span>
            <span>{profile.typings.length} typings</span>
          </div>
          <div className="mt-2">
            <AddToCollectionInline profileSlug={profile.slug} />
          </div>
        </div>
      </div>

      {/* External Links */}
      {profile.externalIds && Object.keys(profile.externalIds).length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {Object.entries(profile.externalIds).map(([key, value]) => (
            <a
              key={key}
              href={value}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2 py-1 text-xs rounded border border-[#1a2234] bg-[#141c2b] text-[#7888a0] hover:text-[#64ffda] transition-colors"
            >
              {key}
            </a>
          ))}
        </div>
      )}

      {/* Bio */}
      {profile.bio && (
        <section>
          <h2 className="text-sm font-semibold text-[#7888a0] uppercase tracking-wider mb-2">Biography</h2>
          <p className="text-sm text-[#c8d0dc] leading-relaxed">{profile.bio}</p>
        </section>
      )}

      {/* Typings by System — Replace static display with interactive VotePanel */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[#7888a0] uppercase tracking-wider">
            Personality Typings
          </h2>
          <AddTypingForm profileSlug={profile.slug} />
        </div>
        <VotePanel profileSlug={profile.slug} />
      </section>

      {/* Cluster Disorder Voting */}
      <DisorderVotePanel profileSlug={profile.slug} />

      {/* Trait Vector Analysis */}
      <TraitVotePanel profileSlug={profile.slug} />

      {/* Related Characters */}
      {related.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-[#7888a0] uppercase tracking-wider mb-3">
            Related Characters
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {related.map((p) => (
              <ProfileCard key={p.slug} {...p} />
            ))}
          </div>
        </section>
      )}

      {/* Comments */}
      <section>
        <CommentSection profileSlug={profile.slug} />
      </section>
    </div>
  );
}