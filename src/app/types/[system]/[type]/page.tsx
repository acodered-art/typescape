import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { TYPING_SYSTEMS } from "@/lib/typing-systems";
import { PageTitle, Section, SectionHead, Sheet, Typed } from "@/components/dossier";
import { ProfileCard } from "@/components/profile-card";
import { typePageJsonLd } from "@/lib/json-ld";

/**
 * Programmatic SEO landing page: one per system × type (e.g. /types/mbti/infp).
 *
 * This is the surface that competes with Personality Database's strongest asset
 * — thousands of indexed "characters typed as X" pages. Everything is
 * statically generated so the pages are fast and cheap to crawl.
 *
 * `generateStaticParams` covers the built-in system definitions, which are the
 * only ones with a known, stable type list.
 */

type Params = { system: string; type: string };

function normaliseType(t: string): string {
  return decodeURIComponent(t).toLowerCase();
}

/** The static definition for a system slug, if it exists. */
function systemDef(slug: string) {
  return TYPING_SYSTEMS.find((s) => s.slug === slug);
}

/** Match a URL type segment against the system's declared types, case-insensitively. */
function typeDef(systemSlug: string, typeSegment: string) {
  const sys = systemDef(systemSlug);
  if (!sys) return null;
  const want = normaliseType(typeSegment);
  return sys.types?.find((t) => t.value.toLowerCase() === want) ?? null;
}

export function generateStaticParams(): Params[] {
  const out: Params[] = [];
  for (const sys of TYPING_SYSTEMS) {
    for (const t of sys.types ?? []) {
      out.push({ system: sys.slug, type: t.value });
    }
  }
  return out;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { system, type } = await params;
  const sys = systemDef(system);
  const td = typeDef(system, type);
  if (!sys || !td) return { title: "Type not found — TypeScape" };

  const title = `${td.label} Characters — TypeScape`;
  const description = `Fictional characters, celebrities, and public figures the community types as ${td.value} in ${sys.name}. ${td.description}.`;

  return {
    title,
    description,
    alternates: { canonical: `/types/${sys.slug}/${td.value.toLowerCase()}` },
    openGraph: { title, description, type: "website", url: `/types/${sys.slug}/${td.value.toLowerCase()}` },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function TypeLandingPage({ params }: { params: Promise<Params> }) {
  const { system, type } = await params;
  const sys = systemDef(system);
  const td = typeDef(system, type);
  if (!sys || !td) notFound();

  // One canonical URL per type: lowercase, exactly as the sitemap lists it.
  // Any other casing (ENFP, Enfp) 308-redirects so crawlers never index
  // duplicates of the same page.
  const canonicalType = td.value.toLowerCase();
  const requestedType = decodeURIComponent(type);
  const requestedSystem = decodeURIComponent(system);
  if (requestedSystem !== sys.slug || requestedType !== canonicalType) {
    permanentRedirect(`/types/${sys.slug}/${canonicalType}`);
  }

  // The DB stores the type verbatim; match case-insensitively.
  const profiles = await prisma.profile.findMany({
    where: {
      typings: {
        some: {
          typeValue: { equals: td.value, mode: "insensitive" },
          typingSystem: { slug: sys.slug },
        },
      },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      imageUrl: true,
      description: true,
      category: { select: { name: true, slug: true } },
      typings: {
        select: {
          typeValue: true,
          confidence: true,
          typingSystem: { select: { name: true, slug: true } },
        },
      },
    },
    orderBy: { viewCount: "desc" },
    take: 48,
  });

  const total = await prisma.profileTyping.count({
    where: {
      typeValue: { equals: td.value, mode: "insensitive" },
      typingSystem: { slug: sys.slug },
    },
  });

  const count = (k: number, one: string, many = `${one}s`) => `${k} ${k === 1 ? one : many}`;

  const jsonLd = typePageJsonLd({
    system: sys.slug,
    systemName: sys.name,
    type: td.value,
    label: td.label,
    description: td.description,
    total,
    names: profiles.map((p) => p.name),
  });

  return (
    <div className="pb-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PageTitle
        title={td.label}
        aside={`${count(total, "file")} on record`}
      />

      <div className="flex max-w-[860px] flex-col gap-6">
        <Sheet className="flex flex-col gap-3 p-5">
          <Typed className="text-[15px] leading-[1.6]">{td.description}.</Typed>
          <Typed className="text-[13px] leading-[1.6] text-navy">
            This is the community&apos;s record of who codes as {td.value} in {sys.name}. Every
            reading is voted on, so the list reflects agreement rather than one editor&apos;s
            opinion.{" "}
            <Link href={`/search?system=${sys.slug}&type=${encodeURIComponent(td.value)}`} className="underline">
              Browse all {sys.name} readings
            </Link>
            .
          </Typed>
        </Sheet>

        {profiles.length > 0 ? (
          <Section>
            <SectionHead title={`Typed as ${td.value}`} aside={count(profiles.length, "shown")} />
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {profiles.map((p) => (
                <ProfileCard
                  key={p.slug}
                  name={p.name}
                  slug={p.slug}
                  imageUrl={p.imageUrl}
                  description={p.description}
                  category={p.category}
                  typings={p.typings}
                  variant="sheet"
                />
              ))}
            </div>
          </Section>
        ) : (
          <Sheet className="p-5">
            <Typed>
              Nobody has been filed as {td.value} in {sys.name} yet.{" "}
              <Link href="/create" className="underline">
                Be the first
              </Link>
              .
            </Typed>
          </Sheet>
        )}

        <Section>
          <SectionHead title={`Other ${sys.name} types`} />
          <div className="flex flex-wrap gap-2">
            {(sys.types ?? []).map((t) => (
              <Link
                key={t.value}
                href={`/types/${sys.slug}/${t.value.toLowerCase()}`}
                className={`border px-3 py-1 font-typed text-[13px] ${
                  t.value === td.value ? "border-blue bg-blue text-ink" : "border-steel hover:border-navy hover:bg-paper-2"
                }`}
              >
                {t.value}
              </Link>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}
