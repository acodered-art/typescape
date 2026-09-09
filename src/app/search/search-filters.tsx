import { Cabinet, PopularTypes, type FacetType } from "./browse-parts";

interface FacetData {
  total: number;
  categories: { slug: string; name: string; count: number }[];
  types: FacetType[];
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

/** The Browse rail: the cabinet (categories with counts) and the popular types. Every link keeps the rest of the search. */
export function SearchFilters({ currentQ, currentCategory, currentType, currentTypes, currentSystem, currentSort, facets }: SearchFiltersProps) {
  const keep = { q: currentQ, type: currentType, types: currentTypes, system: currentSystem, sort: currentSort };
  return (
    <>
      <Cabinet
        all={{ href: buildHref({ ...keep, category: "" }), label: "All files", count: facets.total, active: !currentCategory }}
        rows={facets.categories.map((cat) => ({ href: buildHref({ ...keep, category: cat.slug }), label: cat.name, count: cat.count, active: currentCategory === cat.slug }))}
      />
      <PopularTypes
        types={facets.types}
        currentType={currentType}
        currentSystem={currentSystem}
        hrefFor={(tf) => buildHref({ q: currentQ, category: currentCategory, type: tf.typeValue, types: currentTypes, system: tf.systemSlug, sort: currentSort })}
      />
    </>
  );
}
