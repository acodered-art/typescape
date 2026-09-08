import type { MetadataRoute } from "next";

/**
 * Crawler rules.
 *
 * The private surfaces are the API and the admin panel: neither has anything
 * worth indexing, and the API would just burn rate limit. Everything else is
 * open — this site's whole business is being findable.
 */

const BASE = (process.env.NEXT_PUBLIC_SITE_URL || "https://typescape.walker-fg.uk").replace(/\/$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin", "/settings"],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
