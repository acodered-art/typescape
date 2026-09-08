import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/client-ip";

/**
 * POST /api/match
 *
 * "Which character are you?" — take a reader's own MBTI and/or Enneagram result
 * and rank the character files they most resemble.
 *
 * Body: { mbti?: string, enneagram?: string, limit?: number }
 *
 * Scoring is deliberately transparent rather than clever: an exact MBTI match is
 * worth 3, an Enneagram core match 2, and an Enneagram wing match 1. Ties break
 * on the leading read's confidence, then view count. No account required.
 */

const MBTI_RE = /^[EI][SN][TF][JP]$/i;
const ENNEA_RE = /^(\d)(w(\d))?$/i;

const MAX_LIMIT = 24;

export async function POST(req: Request) {
  const ip = clientIp(req);
  const rl = await rateLimit(`match:${ip}`, 20, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: { mbti?: unknown; enneagram?: unknown; limit?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const mbti = typeof body.mbti === "string" ? body.mbti.trim().toUpperCase() : "";
  const enneagram = typeof body.enneagram === "string" ? body.enneagram.trim() : "";

  if (!mbti && !enneagram) {
    return NextResponse.json(
      { error: "Provide an mbti and/or enneagram result" },
      { status: 400 }
    );
  }
  if (mbti && !MBTI_RE.test(mbti)) {
    return NextResponse.json({ error: "mbti must look like INFP" }, { status: 400 });
  }
  const enneaMatch = enneagram ? enneagram.match(ENNEA_RE) : null;
  if (enneagram && !enneaMatch) {
    return NextResponse.json({ error: "enneagram must look like 4 or 4w5" }, { status: 400 });
  }

  const limit = Math.min(Math.max(Number(body.limit) || 12, 1), MAX_LIMIT);

  // Every typing that could match, with its profile and the votes that decide
  // the tie-break. The corpus is small; one query beats N.
  const typings = await prisma.profileTyping.findMany({
    select: {
      typeValue: true,
      confidence: true,
      typingSystem: { select: { slug: true } },
      votes: { select: { voteValue: true, weight: true } },
      profile: {
        select: {
          id: true,
          slug: true,
          name: true,
          imageUrl: true,
          viewCount: true,
          category: { select: { name: true, slug: true } },
        },
      },
    },
  });

  type Scored = {
    slug: string;
    name: string;
    imageUrl: string | null;
    category: { name: string; slug: string } | null;
    score: number;
    reasons: string[];
    mbti: string | null;
    enneagram: string | null;
    readCount: number;
  };

  const byProfile = new Map<string, Scored>();
  const coreOf = (v: string) => v.match(ENNEA_RE)?.[1] ?? null;
  const wingOf = (v: string) => v.match(ENNEA_RE)?.[3] ?? null;

  for (const t of typings) {
    const system = t.typingSystem.slug;
    const scored = byProfile.get(t.profile.id) ?? {
      slug: t.profile.slug,
      name: t.profile.name,
      imageUrl: t.profile.imageUrl,
      category: t.profile.category,
      score: 0,
      reasons: [],
      mbti: null,
      enneagram: null,
      readCount: 0,
    };
    scored.readCount += t.votes.length;

    if (mbti && system === "mbti" && t.typeValue.toUpperCase() === mbti) {
      scored.score += 3;
      scored.mbti = t.typeValue.toUpperCase();
      scored.reasons.push(`${t.typeValue.toUpperCase()} matches your type`);
    }

    if (enneagram && system === "enneagram") {
      const core = coreOf(t.typeValue);
      const wing = wingOf(t.typeValue);
      if (core && core === enneaMatch![1]) {
        scored.score += 2;
        scored.enneagram = t.typeValue;
        scored.reasons.push(`Enneagram ${core} core matches`);
        if (enneaMatch![3] && wing === enneaMatch![3]) {
          scored.score += 1;
          scored.reasons.push(`same ${core}w${wing} wing`);
        }
      }
    }

    byProfile.set(t.profile.id, scored);
  }

  const ranked = [...byProfile.values()]
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || b.readCount - a.readCount || a.name.localeCompare(b.name))
    .slice(0, limit);

  const maxScore = ranked.length > 0 ? ranked[0].score : 0;

  return NextResponse.json({
    input: { mbti: mbti || null, enneagram: enneagram || null },
    matched: ranked.length,
    maxScore,
    results: ranked.map((r) => ({
      slug: r.slug,
      name: r.name,
      imageUrl: r.imageUrl,
      category: r.category,
      score: r.score,
      // 0-100 so the UI can draw a bar without knowing the weighting.
      strength: maxScore > 0 ? Math.round((r.score / maxScore) * 100) : 0,
      reasons: r.reasons,
      mbti: r.mbti,
      enneagram: r.enneagram,
    })),
  });
}
