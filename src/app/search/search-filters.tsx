import Link from "next/link";
import { TYPING_SYSTEMS } from "@/lib/typing-systems";

interface FacetData {
  total: number;
  categories: { slug: string; name: string; count: number }[];
  types: { typeValue: string; systemSlug: string; systemName: string; count: number }[];
}

interface SearchFiltersProps {
  currentQ: string;
  currentCategory: string;
  currentType: string;
  currentTypes: string;
  currentSystem: string;
  currentSort: string;
  facets: FacetData;
}

function buildHref(changes: Record<string, string | null>): string {
  const p = new URLSearchParams();
  if (changes.q) p.set("q", changes.q);
  if (changes.category) p.set("category", changes.category);
  if (changes.type) p.set("type", changes.type);
  if (changes.types) p.set("types", changes.types);
  if (changes.system) p.set("system", changes.system);
  if (changes.sort) p.set("sort", changes.sort);
  return `/search?${p.toString()}`;
}

export function SearchFilters({ currentQ, currentCategory, currentType, currentTypes, currentSystem, currentSort, facets }: SearchFiltersProps) {
  return (
    <div className="space-y-5">
      {/* Category Facets */}
      <div>
        <h3 className="text-xs font-semibold text-[#7888a0] uppercase tracking-wider mb-2">Category</h3>
        <div className="space-y-0.5">
          <Link
            href={buildHref({ q: currentQ, category: "", type: currentType, types: currentTypes, system: currentSystem, sort: currentSort })}
            className={`block px-2 py-1 text-xs rounded transition-colors ${
              !currentCategory ? "bg-[#64ffda]/10 text-[#64ffda]" : "text-[#7888a0] hover:text-[#c8d0dc]"
            }`}
          >
            All
          </Link>
          {facets.categories.map((cat) => (
            <Link
              key={cat.slug}
              href={buildHref({ q: currentQ, category: cat.slug, type: currentType, types: currentTypes, system: currentSystem, sort: currentSort })}
              className={`flex items-center justify-between px-2 py-1 text-xs rounded transition-colors ${
                currentCategory === cat.slug ? "bg-[#64ffda]/10 text-[#64ffda]" : "text-[#7888a0] hover:text-[#c8d0dc]"
              }`}
            >
              <span>{cat.name}</span>
              <span className="text-[#4a5a70]">{cat.count}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Type Facets */}
      <div>
        <h3 className="text-xs font-semibold text-[#7888a0] uppercase tracking-wider mb-2">Popular Types</h3>
        <div className="space-y-0.5">
          {facets.types.map((tf) => (
            <Link
              key={`${tf.systemSlug}-${tf.typeValue}`}
              href={buildHref({ q: currentQ, category: currentCategory, type: tf.typeValue, types: currentTypes, system: tf.systemSlug, sort: currentSort })}
              className={`flex items-center justify-between px-2 py-1 text-xs rounded transition-colors ${
                currentType === tf.typeValue && currentSystem === tf.systemSlug ? "bg-[#64ffda]/10 text-[#64ffda]" : "text-[#7888a0] hover:text-[#c8d0dc]"
              }`}
            >
              <span>
                <span className="text-[#4a5a70]">{tf.systemName}</span>{" "}
                <span className="font-medium">{tf.typeValue}</span>
              </span>
              <span className="text-[#4a5a70]">{tf.count}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}