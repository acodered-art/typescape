import { prisma } from "@/lib/db";
import { authenticateApiRequest, hasScope } from "@/lib/api-auth";

/**
 * GET /api/v1/profiles/[slug] — one character file with all its readings.
 *
 * Same key/scope rules as the collection endpoint. Returns 404 rather than an
 * empty object so a client can branch cleanly.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const auth = await authenticateApiRequest(req);
  if ("response" in auth) return auth.response;
  if (!hasScope(auth, "read")) {
    return Response.json({ error: "This key lacks the 'read' scope" }, { status: 403 });
  }

  const { slug } = await params;

  const profile = await prisma.profile.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      bio: true,
      imageUrl: true,
      viewCount: true,
      createdAt: true,
      updatedAt: true,
      category: { select: { name: true, slug: true } },
      typings: {
        select: {
          typeValue: true,
          confidence: true,
          isCommunity: true,
          details: true,
          typingSystem: { select: { name: true, slug: true } },
          votes: { select: { voteValue: true, weight: true } },
        },
        orderBy: { confidence: "desc" },
      },
      _count: { select: { comments: true, typings: true } },
    },
  });

  if (!profile) {
    return Response.json({ error: "Profile not found" }, { status: 404 });
  }

  // Summarise the votes per reading so clients do not have to know the
  // weighting rule. `calcConsensus` is the same function the site uses.
  const { calcConsensus } = await import("@/lib/utils");
  const readings = profile.typings.map((t) => ({
    system: t.typingSystem.slug,
    systemName: t.typingSystem.name,
    type: t.typeValue,
    confidence: t.confidence,
    isCommunity: t.isCommunity,
    details: t.details,
    votes: t.votes.length,
    agreement: calcConsensus(t.votes, 0).percentage,
  }));

  return Response.json({
    data: {
      id: profile.id,
      name: profile.name,
      slug: profile.slug,
      description: profile.description,
      bio: profile.bio,
      imageUrl: profile.imageUrl,
      viewCount: profile.viewCount,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
      category: profile.category,
      readings,
      counts: profile._count,
    },
  });
}
