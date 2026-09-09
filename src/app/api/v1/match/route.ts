import { prisma } from "@/lib/db";
import { guardV1, okWithLimit, fail } from "@/lib/api-v1";

/**
 * POST /api/v1/match — "which character are you?"
 *
 * Body: { mbti?, enneagram?, limit? }. Scoring lives here rather than in the
 * client so every platform ranks identically and a change ships once.
 */
const MBTI_RE = /^[EI][SN][TF][JP]$/i;
const ENNEA_RE = /^(\d)(w(\d))?$/i;

export async function POST(req: Request) {
  const guard = await guardV1(req);
  if (guard.response) return guard.response;

  let body: { mbti?: unknown; enneagram?: unknown; limit?: unknown };
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON", 400);
  }

  const mbti = typeof body.mbti === "string" ? body.mbti.trim().toUpperCase() : "";
  const enneagram = typeof body.enneagram === "string" ? body.enneagram.trim() : "";
  if (!mbti && !enneagram) return fail("Provide an mbti and/or enneagram result", 400);
  if (mbti && !MBTI_RE.test(mbti)) return fail("mbti must look like INFP", 400);
  const ennea = enneagram ? enneagram.match(ENNEA_RE) : null;
  if (enneagram && !ennea) return fail("enneagram must look like 4 or 4w5", 400);

  const limit = Math.min(Math.max(Number(body.limit) || 12, 1), 24);
  const core = (v: string) => v.match(ENNEA_RE)?.[1] ?? null;
  const wing = (v: string) => v.match(ENNEA_RE)?.[3] ?? null;

  const typings = await prisma.profileTyping.findMany({
    select: {
      typeValue: true,
      typingSystem: { select: { slug: true } },
      votes: { select: { id: true } },
      profile: { select: { id: true, slug: true, name: true, imageUrl: true } },
    },
  });

  type Scored = {
    slug: string;
    name: string;
    imageUrl: string | null;
    score: number;
    reasons: string[];
    reads: number;
  };
  const byProfile = new Map<string, Scored>();

  for (const t of typings) {
    const s =
      byProfile.get(t.profile.id) ??
      { slug: t.profile.slug, name: t.profile.name, imageUrl: t.profile.imageUrl, score: 0, reasons: [], reads: 0 };
    s.reads += t.votes.length;

    if (mbti && t.typingSystem.slug === "mbti" && t.typeValue.toUpperCase() === mbti) {
      s.score += 3;
      s.reasons.push(`${t.typeValue.toUpperCase()} matches your type`);
    }
    if (enneagram && t.typingSystem.slug === "enneagram") {
      const c = core(t.typeValue);
      if (c && c === ennea![1]) {
        s.score += 2;
        s.reasons.push(`Enneagram ${c} core matches`);
        if (ennea![3] && wing(t.typeValue) === ennea![3]) {
          s.score += 1;
          s.reasons.push(`same ${c}w${ennea![3]} wing`);
        }
      }
    }
    byProfile.set(t.profile.id, s);
  }

  const ranked = [...byProfile.values()]
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || b.reads - a.reads || a.name.localeCompare(b.name))
    .slice(0, limit);
  const max = ranked[0]?.score ?? 0;

  return okWithLimit(guard.auth, 
    ranked.map((r) => ({ ...r, strength: max > 0 ? Math.round((r.score / max) * 100) : 0 })),
    { input: { mbti: mbti || null, enneagram: enneagram || null }, matched: ranked.length }
  );
}
