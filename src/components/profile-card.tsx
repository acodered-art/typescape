import { TypingBadge } from "@/components/typing-badge";
import { AddToCollectionInline } from "@/components/add-to-collection";
import { FileCard, bySystemOrder, uniqueReads } from "@/components/dossier";

interface ProfileCardProps {
  name: string;
  slug: string;
  imageUrl: string | null;
  description: string | null;
  category: { name: string; slug: string } | null;
  typings: { typingSystem: { name: string; slug: string }; typeValue: string; confidence: number }[];
  /** "sheet" inside a white sheet (Browse), "desk" straight on the dark desk (Home) */
  variant?: "sheet" | "desk";
}

/** A character as a file card: series header, portrait, name, the leading reads as chips. */
export function ProfileCard({ name, slug, imageUrl, category, typings, variant = "sheet" }: ProfileCardProps) {
  // Within a system the most agreed read comes first; across systems the site's order holds (the sort is stable).
  const shown = bySystemOrder(uniqueReads(typings).sort((a, b) => b.confidence - a.confidence)).slice(0, 3);
  return (
    <FileCard
      href={`/profiles/${slug}`}
      name={name}
      series={category?.name}
      aside={typings.length > 0 ? `${typings.length} ${typings.length === 1 ? "finding" : "findings"}` : "no findings yet"}
      imageUrl={imageUrl}
      variant={variant}
      chips={shown.length > 0 ? shown.map((t, i) => (
        <TypingBadge
          key={`${t.typingSystem.slug}-${t.typeValue}`}
          systemSlug={t.typingSystem.slug}
          systemName={t.typingSystem.name}
          typeValue={t.typeValue}
          confidence={t.confidence}
          tone={i === 0 ? "blue" : "navy"}
        />
      )) : undefined}
    >
      <div className="flex justify-end px-3 pb-2">
        <AddToCollectionInline profileSlug={slug} />
      </div>
    </FileCard>
  );
}
