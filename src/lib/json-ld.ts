/**
 * JSON-LD builders for crawlers.
 *
 * Structured data is how a result earns a rich snippet instead of a plain blue
 * link, which matters more than any on-page copy for a database site. Kept pure
 * so the shape can be unit-tested, and escaped by React when injected via a
 * `<script type="application/ld+json">` tag.
 */

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://typescape.walker-fg.uk";
const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || "TypeScape";

function absolute(path: string): string {
  return `${SITE.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

export interface ProfileJsonLdInput {
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  category: { name: string; slug: string } | null;
  readings: { system: string; type: string }[];
  comments: number;
}

/**
 * A character/celebrity file as a `Person` whose properties carry the community
 * readings. `additionalProperty` is the standards-compliant way to attach
 * arbitrary typed attributes without inventing a schema.
 */
export function profileJsonLd(p: ProfileJsonLdInput): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: p.name,
    url: absolute(`/profiles/${p.slug}`),
    ...(p.description ? { description: p.description } : {}),
    ...(p.imageUrl ? { image: p.imageUrl } : {}),
    ...(p.category ? { subjectOf: { "@type": "CreativeWork", name: p.category.name } } : {}),
    additionalProperty: p.readings.map((r) => ({
      "@type": "PropertyValue",
      name: `${r.system} type`,
      value: r.type,
    })),
    ...(p.comments > 0
      ? { interactionStatistic: { "@type": "InteractionCounter", interactionType: "CommentAction", userInteractionCount: p.comments } }
      : {}),
  };
}

export interface TypePageJsonLdInput {
  system: string;
  systemName: string;
  type: string;
  label: string;
  description: string;
  total: number;
  names: string[];
}

/** A listing of everyone filed under one type, as an `ItemList`. */
export function typePageJsonLd(t: TypePageJsonLdInput): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${t.label} characters`,
    description: `Fictional characters and public figures the community types as ${t.type} in ${t.systemName}.`,
    numberOfItems: t.total,
    url: absolute(`/types/${t.system}/${t.type.toLowerCase()}`),
    itemListElement: t.names.slice(0, 48).map((name, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name,
    })),
  };
}

/** Site-level identity, emitted once in the root layout. */
export function organizationJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: absolute("/"),
    potentialAction: {
      "@type": "SearchAction",
      target: `${absolute("/search")}?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}
