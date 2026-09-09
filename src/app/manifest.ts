import type { MetadataRoute } from "next";

/**
 * PWA manifest. Installing the site to a home screen is the cheapest way to get
 * a daily-return habit without shipping an app store build.
 *
 * Icons are intent-relative (`/icons/*`), served from `public/`.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TypeScape — The Personality Database",
    short_name: "TypeScape",
    description:
      "Community-driven personality database for characters, celebrities, and public figures.",
    start_url: "/",
    display: "standalone",
    background_color: "#01050b",
    theme_color: "#158fd4",
    orientation: "portrait-primary",
    categories: ["entertainment", "social", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Today's character", url: "/daily" },
      { name: "Find my match", url: "/match" },
      { name: "Browse", url: "/search" },
    ],
  };
}
