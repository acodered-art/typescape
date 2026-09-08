import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { TYPING_SYSTEMS } from "@/lib/typing-systems";

/**
 * Sitemap for crawlers.
 *
 * Priorities reflect crawl value: character files change and are the main
 * landing surface; programmatic type pages are the SEO farm; static pages are
 * mostly entry points. Regenerated per request (the profile list changes), so
 * keep it cheap: one query per resource and no per-row work.
 */

const BASE = (process.env.NEXT_PUBLIC_SITE_URL || "https://typescape.walker-fg.uk").replace(/\/$/, "");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE}/search`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE}/match`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/compatibility`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE}/daily`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: `${BASE}/plans`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/embed`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${BASE}/systems`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE}/test`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/compare`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/collections`, lastModified: now, changeFrequency: "weekly", priority: 0.5 },
    { url: `${BASE}/groups`, lastModified: now, changeFrequency: "weekly", priority: 0.5 },
    { url: `${BASE}/feed`, lastModified: now, changeFrequency: "hourly", priority: 0.4 },
  ];

  // Character files.
  let profiles: MetadataRoute.Sitemap = [];
  try {
    const rows = await prisma.profile.findMany({
      select: { slug: true, updatedAt: true },
      orderBy: { viewCount: "desc" },
      take: 5000,
    });
    profiles = rows.map((p) => ({
      url: `${BASE}/profiles/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    }));
  } catch {
    profiles = [];
  }

  // Public collections.
  let collections: MetadataRoute.Sitemap = [];
  try {
    const rows = await prisma.collection.findMany({
      where: { isPublic: true },
      select: { slug: true, updatedAt: true },
      take: 2000,
    });
    collections = rows.map((c) => ({
      url: `${BASE}/collections/${c.slug}`,
      lastModified: c.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));
  } catch {
    collections = [];
  }

  // Programmatic type landings.
  const typePages: MetadataRoute.Sitemap = TYPING_SYSTEMS.flatMap((sys) =>
    (sys.types ?? []).map((t) => ({
      url: `${BASE}/types/${sys.slug}/${t.value.toLowerCase()}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }))
  );

  return [...staticRoutes, ...profiles, ...collections, ...typePages];
}
