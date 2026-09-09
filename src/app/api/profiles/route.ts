import { NextResponse } from "next/server";
import { guardCsrf } from "@/lib/csrf";
import { prisma } from "@/lib/db";
import { generateSlug } from "@/lib/utils";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp, isInternalRequest } from "@/lib/client-ip";
import { searchProfiles, buildDocsFromDb, indexProfiles } from "@/lib/search";
import { guardCanPost } from "@/lib/post-guard";

export async function GET(req: Request) {
  const ip = clientIp(req);
  // SSR self-fetches come from the container/localhost. Anything we cannot
  // attribute is limited on the shared "unknown" bucket rather than exempted.
  if (!isInternalRequest(req)) {
    const rl = await rateLimit(`profiles-get:${ip}`, 60, 60_000);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const category = searchParams.get("category");
  const system = searchParams.get("system");
  const type = searchParams.get("type");
  // Multi-type: comma-separated list of types (AND semantics) — e.g. ?types=INFP,4
  const typesParam = searchParams.get("types");
  const types = typesParam ? typesParam.split(",").filter(Boolean) : [];
  const sort = searchParams.get("sort") || "views";
  const rawLimit = Number(searchParams.get("limit")) || 20;
  const rawOffset = Number(searchParams.get("offset")) || 0;
  const limit = Math.min(Math.max(Math.floor(rawLimit), 1), 50);
  const offset = Math.max(Math.floor(rawOffset), 0);

  const where: Record<string, unknown> = {};

  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { bio: { contains: q, mode: "insensitive" } },
    ];
  }

  if (category) {
    where.category = { slug: category };
  }

  // Single type filter (system-scoped if provided)
  if (type) {
    where.typings = {
      some: {
        typeValue: type,
        ...(system ? { typingSystem: { slug: system } } : {}),
      },
    };
  }

  // Multi-type AND filter: profile must have a typing matching EVERY requested type
  if (types.length > 0) {
    where.AND = types.map((t) => ({
      typings: {
        some: { typeValue: t },
      },
    }));
  }

  // Sorting
  const orderBy: Record<string, unknown>[] = [];
  switch (sort) {
    case "recent":
      orderBy.push({ createdAt: "desc" });
      break;
    case "name":
      orderBy.push({ name: "asc" });
      break;
    case "votes":
      orderBy.push({ viewCount: "desc" }); // fallback to views if no vote aggregate
      break;
    case "typings":
      orderBy.push({ createdAt: "desc" });
      break;
    case "views":
    default:
      orderBy.push({ viewCount: "desc" });
      break;
  }

  // ── Search path ─────────────────────────────────────────────────────────
  // When there is a text query, ask MeiliSearch first: it gives typo tolerance
  // and ranking that Postgres `contains` cannot. Any failure (unreachable,
  // timeout, bad reply) returns null and we fall through to the SQL path, so a
  // search outage degrades to today's behaviour instead of breaking the page.
  if (q) {
    const meili = await searchProfiles({
      q,
      types: types.length ? types : undefined,
      categorySlug: category ?? undefined,
      sort,
      limit,
      offset,
    });

    if (meili) {
      // Hydrate the hits with the same shape the SQL path returns, in the
      // relevance order Meili gave us.
      const rows = await prisma.profile.findMany({
        where: { id: { in: meili.hits.map((h) => h.id) } },
        select: {
          id: true,
          name: true,
          slug: true,
          categoryId: true,
          description: true,
          imageUrl: true,
          imageModeration: true,
          bio: true,
          isVerified: true,
          viewCount: true,
          createdAt: true,
          updatedAt: true,
          category: { select: { name: true, slug: true } },
          typings: {
            select: {
              typeValue: true,
              details: true,
              isCommunity: true,
              typingSystem: { select: { name: true, slug: true } },
            },
            take: 5,
          },
          _count: { select: { typings: true, comments: true } },
        },
      });
      const byId = new Map(rows.map((r) => [r.id, r]));
      const profiles = meili.hits
        .map((h) => byId.get(h.id))
        .filter((p): p is NonNullable<typeof p> => !!p);

      return NextResponse.json({
        profiles,
        total: meili.total,
        limit,
        offset,
        engine: "meilisearch",
      });
    }
  }

  const [profiles, total] = await Promise.all([
    prisma.profile.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        categoryId: true,
        description: true,
        imageUrl: true,
        imageModeration: true,
        bio: true,
        isVerified: true,
        viewCount: true,
        createdAt: true,
        updatedAt: true,
        category: { select: { name: true, slug: true } },
        typings: {
          select: {
            typeValue: true,
            details: true,
            isCommunity: true,
            typingSystem: { select: { name: true, slug: true } },
          },
          take: 5,
        },
        _count: { select: { typings: true, comments: true } },
      },
      orderBy,
      skip: offset,
      take: limit,
    }),
    prisma.profile.count({ where }),
  ]);

  return NextResponse.json({ profiles, total, limit, offset });
}

export async function POST(req: Request) {
  const csrfError = await guardCsrf(req);
  if (csrfError) return csrfError;
  const { auth } = await import("@/lib/session");
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // A ban or timeout must actually stop writes.
  const blocked = await guardCanPost(session.user.id);
  if (blocked?.response) return blocked.response;

  const ip = clientIp(req);
  const rl = await rateLimit(`profile-create:${ip}`, 3, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many profiles" }, { status: 429 });
  }

  const body = await req.json();
  const { name, categoryId, description, imageUrl, bio, externalIds } = body;

  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }

  // Generate unique slug
  let slug = generateSlug(name);
  let attempts = 0;
  while (attempts < 10) {
    const existing = await prisma.profile.findUnique({ where: { slug }, select: { id: true } });
    if (!existing) break;
    attempts++;
    slug = generateSlug(name, `${Date.now()}-${attempts}`);
  }

  const profile = await prisma.profile.create({
    data: {
      name,
      slug,
      categoryId,
      description,
      imageUrl,
      bio,
      externalIds: externalIds || undefined,
      createdBy: session.user.id,
    },
  });

  // Keep the search index fresh. Best-effort: a search outage must not fail a
  // creation, and the reindex script can always repair drift.
  try {
    const docs = await buildDocsFromDb(prisma as never, { id: profile.id });
    await indexProfiles(docs);
  } catch {
    /* ignored: profile is created, index catches up later */
  }

  return NextResponse.json(profile, { status: 201 });
}