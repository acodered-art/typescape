import type { Metadata, Viewport } from "next";
import { Big_Shoulders, Courier_Prime, Public_Sans } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/header";
import { FloatingAddButton } from "@/components/floating-add-button";
import { InkFilter } from "@/components/dossier";
import { organizationJsonLd } from "@/lib/json-ld";
import { ServiceWorkerRegistrar } from "@/components/service-worker-registrar";
import { OutboxStatus } from "@/components/outbox-status";

// Printed face: labels, headings, names, the wordmark, the stamp.
// Google now ships Big Shoulders as one variable family with an optical-size axis;
// globals.css pins "opsz" 72 on display text so it renders as the old Display cut at every size.
const display = Big_Shoulders({
  // The variable family has no fallback metrics in next/font's table; without this flag every render logs a warning.
  adjustFontFallback: false,
  variable: "--font-big-shoulders",
  subsets: ["latin"],
  weight: "variable",
  axes: ["opsz"],
});
// Typed face: codes, field values, counts, small buttons. It means "typed by a reader".
const typed = Courier_Prime({
  variable: "--font-courier-prime",
  subsets: ["latin"],
  weight: ["400", "700"],
});
// Running text.
const body = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "TypeScape — The Personality Database",
  description: "Discover, rate, and debate personality types for fictional characters, celebrities, and more. Community-driven MBTI, Enneagram, Big Five, and more.",
  // Without this, relative `openGraph.images` resolve against the request origin
  // (http://localhost:3002 behind the tunnel), so social cards point at a URL no
  // crawler can fetch.
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://typescape.walker-fg.uk"),
  openGraph: {
    title: "TypeScape",
    description: "Community-driven personality database for characters and celebrities.",
    type: "website",
    siteName: process.env.NEXT_PUBLIC_SITE_NAME || "TypeScape",
  },
  twitter: {
    card: "summary_large_image",
  },
  // Safari on iOS ignores the web manifest for the home-screen experience and
  // reads these instead. Without them an installed app opens in a browser
  // chrome with a white status bar and no icon.
  icons: {
    // Safari uses this for the home-screen icon; the manifest icons cover
    // Android and desktop.
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    title: process.env.NEXT_PUBLIC_SITE_NAME || "TypeScape",
    statusBarStyle: "black-translucent",
  },
};

/** Keeps the browser UI (and the installed PWA status bar) in the site's ink. */
export const viewport: Viewport = {
  themeColor: "#01050b",
  width: "device-width",
  initialScale: 1,
  // The desk layout is fixed-width at 1100px; allow zoom for accessibility.
  maximumScale: 5,
  // Draw under the notch/rounded corners so the standalone app fills the screen.
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${typed.variable} ${body.variable}`}>
      <body className="min-h-screen bg-ink font-body text-paper">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }}
        />
        <InkFilter />
        <Header />
        {/* The page is a 1100px desk: 40px padding either side of 1020px of content. */}
        <main className="mx-auto w-full max-w-[1100px] px-4 pb-10 sm:px-10">{children}</main>
        <FloatingAddButton />
        <ServiceWorkerRegistrar />
        <div className="mx-auto w-full max-w-[1100px] px-4 sm:px-10">
          <OutboxStatus />
        </div>
      </body>
    </html>
  );
}
