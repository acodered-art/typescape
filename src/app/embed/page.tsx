import type { Metadata } from "next";
import Script from "next/script";
import { PageTitle, SectionHead, Sheet, Typed } from "@/components/dossier";

export const metadata: Metadata = {
  title: "Embed a character card — TypeScape",
  description:
    "Drop a TypeScape character card into any website with one div and one script tag. No API key needed.",
  alternates: { canonical: "/embed" },
};

/**
 * Documentation + live demo for the embeddable card.
 *
 * The demo uses the real script against this same origin, so the page proves the
 * snippet works rather than just describing it.
 */
export default function EmbedPage() {
  const snippet = `<!-- anywhere in your page -->
<div data-typescape-card="naruto-uzumaki"></div>

<!-- once, anywhere -->
<script async src="https://typescape.walker-fg.uk/embed.js"></script>`;

  return (
    <div className="pb-10">
      <PageTitle title="Embed a card" aside="No key, no account, no tracking." />
      <div className="flex max-w-[860px] flex-col gap-8">
        <Sheet className="flex flex-col gap-3 p-5">
          <Typed className="text-[15px] leading-[1.6]">
            Put a character&apos;s card on any page — a blog post, a wiki, a forum signature.
            The script fetches the card data and renders it inline, so it inherits your page&apos;s
            typography, width, and scrolling instead of sitting in an iframe.
          </Typed>
          <pre className="overflow-x-auto border border-steel bg-paper-2 p-3 font-typed text-[12px] leading-[1.6] text-ink">
            <code>{snippet}</code>
          </pre>
          <Typed className="text-[13px] leading-[1.6] text-navy">
            Use the profile slug from the URL — <code className="font-typed">/profiles/naruto-uzumaki</code>{" "}
            means <code className="font-typed">naruto-uzumaki</code>. Data is cached for five minutes and
            refreshes on its own. If the request fails for any reason the host page is left
            untouched.
          </Typed>
        </Sheet>

        <div>
          <SectionHead title="Live example" aside="Rendered by the script below" />
          <div data-typescape-card="naruto-uzumaki" />
          <Script src="/embed.js" strategy="afterInteractive" />
        </div>

        <Sheet className="flex flex-col gap-2 p-5">
          <SectionHead title="Data endpoint" size={20} />
          <Typed className="text-[13px] leading-[1.6]">
            The card reads{" "}
            <code className="font-typed">GET /api/embed/card?slug=&lt;slug&gt;</code>, which is
            public and CORS-open. It returns the name, image, category, description, and up to
            three leading reads — never user data. Build your own layout against it if you would
            rather not use the bundled script.
          </Typed>
        </Sheet>
      </div>
    </div>
  );
}
