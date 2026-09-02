import Link from "next/link";
import { TypingBadge } from "@/components/typing-badge";
import { AddToCollectionInline } from "@/components/add-to-collection";

interface ProfileCardProps {
  name: string;
  slug: string;
  imageUrl: string | null;
  description: string | null;
  category: { name: string; slug: string } | null;
  typings: { typingSystem: { name: string; slug: string }; typeValue: string; confidence: number }[];
}

export function ProfileCard({ name, slug, imageUrl, description, category, typings }: ProfileCardProps) {
  return (
    <div className="block p-4 rounded-lg border border-[#1a2234] bg-[#0e1420] hover:border-[#2a3a4a] hover:bg-[#141c2b] transition-all group">
      <Link href={`/profiles/${slug}`} className="flex gap-3">
        {imageUrl && (
          <div className="w-14 h-14 rounded-md overflow-hidden shrink-0 bg-[#1a2234]">
            <img src={imageUrl} alt={name} className="w-full h-full object-cover" loading="lazy" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-[#e8ecf4] group-hover:text-[#64ffda] transition-colors truncate">
            {name}
          </h3>
          {category && (
            <span className="text-xs text-[#4a5a70]">{category.name}</span>
          )}
          {description && (
            <p className="text-sm text-[#7888a0] mt-1 line-clamp-2">{description}</p>
          )}
          {typings.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {typings.slice(0, 3).map((t) => (
                <TypingBadge
                  key={`${t.typingSystem.slug}-${t.typeValue}`}
                  systemSlug={t.typingSystem.slug}
                  systemName={t.typingSystem.name}
                  typeValue={t.typeValue}
                  confidence={t.confidence}
                />
              ))}
            </div>
          )}
        </div>
      </Link>
      <div className="mt-2 flex justify-end">
        <AddToCollectionInline profileSlug={slug} />
      </div>
    </div>
  );
}