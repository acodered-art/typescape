import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/embed/card?slug=<profile>
 *
 * Public, keyless JSON for the embeddable TypeCard shown by `/embed.js`.
 * Deliberately separate from `/api/v1`: that surface is keyed and rate-limited
 * per developer, this one must work from any third-party page with no setup.
 *
 * Returns a small, presentation-ready payload and no user data.
 */

const CORS = {
  // Embeddable by design: any origin may read this.
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  // Third-party pages should not hold a stale card for long.
  "Cache-Control": "public, max-age=300, s-maxage=600",
};

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: CORS });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get("slug")?.trim();
  if (!slug) {
    return json({ error: "slug is required" }, 400);
  }

  const profile = await prisma.profile.findUnique({
    where: { slug },
    select: {
      name: true,
      slug: true,
      imageUrl: true,
      description: true,
      category: { select: { name: true } },
      typings: {
        select: {
          typeValue: true,
          typingSystem: { select: { name: true, slug: true } },
          votes: { select: { voteValue: true, weight: true } },
        },
      },
    },
  });

  if (!profile) {
    return json({ error: "Profile not found" }, 404);
  }

  // One lead read per system, most-voted first; at most three so the card stays
  // readable at small widths.
  const seen = new Set<string>();
  const reads = profile.typings
    .filter((t) => (seen.has(t.typingSystem.slug) ? false : (seen.add(t.typingSystem.slug), true)))
    .sort((a, b) => b.votes.length - a.votes.length)
    .slice(0, 3)
    .map((t) => ({
      system: t.typingSystem.slug,
      systemName: t.typingSystem.name.replace(/\s*\(.*\)\s*$/, ""),
      type: t.typeValue,
      votes: t.votes.length,
    }));

  return json({
    name: profile.name,
    slug: profile.slug,
    imageUrl: profile.imageUrl,
    description: profile.description,
    category: profile.category?.name ?? null,
    reads,
    url: `/profiles/${profile.slug}`,
  });
}
