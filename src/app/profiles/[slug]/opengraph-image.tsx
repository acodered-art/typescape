import { ImageResponse } from "next/og";
import { prisma } from "@/lib/db";

/**
 * Open Graph card for a character file.
 *
 * This is the share surface: a link dropped into Discord/Twitter/X renders the
 * character's name and leading reads as a card, which is the cheapest
 * distribution the site has. Deliberately dependency-free apart from `next/og`
 * and readable at thumbnail size (name huge, at most three reads).
 */

export const alt = "TypeScape character file";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const INK = "#01050b";
const BLUE = "#158fd4";
const PAPER = "#ffffff";
const STEEL = "#9daecc";
const NAVY = "#0e4a80";

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const profile = await prisma.profile.findUnique({
    where: { slug },
    select: {
      name: true,
      description: true,
      category: { select: { name: true } },
      typings: {
        select: {
          typeValue: true,
          confidence: true,
          typingSystem: { select: { name: true, slug: true } },
          votes: { select: { voteValue: true, weight: true } },
        },
      },
    },
  });

  const name = profile?.name ?? "Unknown file";
  const category = profile?.category?.name ?? "TypeScape";

  // Leading reads: most votes first, one per system, at most three.
  const seen = new Set<string>();
  const reads = (profile?.typings ?? [])
    .filter((t) => {
      if (seen.has(t.typingSystem.slug)) return false;
      seen.add(t.typingSystem.slug);
      return true;
    })
    .sort((a, b) => b.votes.length - a.votes.length)
    .slice(0, 3)
    .map((t) => ({
      system: t.typingSystem.name.replace(/\s*\(.*\)\s*$/, ""),
      value: t.typeValue,
      votes: t.votes.length,
    }));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: INK,
          padding: "64px",
          fontFamily: "sans-serif",
        }}
      >
        {/* header strip */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 26,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: STEEL,
          }}
        >
          <span>{category}</span>
          <span style={{ color: BLUE, fontWeight: 700 }}>TypeScape</span>
        </div>

        {/* the name, as large as it can be */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              fontSize: name.length > 26 ? 74 : 104,
              lineHeight: 1.02,
              fontWeight: 800,
              color: PAPER,
              letterSpacing: -1,
            }}
          >
            {name}
          </div>
          {profile?.description && (
            <div style={{ fontSize: 28, color: STEEL, lineHeight: 1.35 }}>
              {profile.description.slice(0, 140)}
            </div>
          )}
        </div>

        {/* leading reads as ink blocks */}
        <div style={{ display: "flex", gap: 20, alignItems: "flex-end" }}>
          {reads.length > 0 ? (
            reads.map((r, i) => (
              <div
                key={`${r.system}-${r.value}`}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  padding: "18px 26px",
                  background: i === 0 ? BLUE : NAVY,
                  color: i === 0 ? INK : PAPER,
                  minWidth: 220,
                }}
              >
                <span
                  style={{
                    fontSize: 20,
                    letterSpacing: 3,
                    textTransform: "uppercase",
                    opacity: 0.85,
                  }}
                >
                  {r.system}
                </span>
                <span style={{ fontSize: 44, fontWeight: 800, lineHeight: 1 }}>
                  {r.value}
                </span>
              </div>
            ))
          ) : (
            <div style={{ fontSize: 30, color: STEEL }}>
              No findings filed yet — be the first.
            </div>
          )}
        </div>
      </div>
    ),
    size
  );
}
