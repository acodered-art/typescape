import { prisma } from "@/lib/db";
import { guardV1, okWithLimit } from "@/lib/api-v1";

/**
 * GET /api/v1/systems — every typing system with its types.
 *
 * A client needs this to render any type picker or badge label, and it changes
 * rarely, so it is the natural first call on launch and a good caching target.
 */
export async function GET(req: Request) {
  const guard = await guardV1(req);
  if (guard.response) return guard.response;

  const systems = await prisma.typingSystem.findMany({
    orderBy: { sortOrder: "asc" },
    select: {
      slug: true,
      name: true,
      description: true,
      config: true,
      sortOrder: true,
    },
  });

  // `config` holds the type list plus optional dimensions/wings. Normalise it so
  // clients do not have to know the JSON layout.
  const data = systems.map((s) => {
    const config = (s.config ?? {}) as Record<string, unknown>;
    const types = Array.isArray(config.types) ? config.types : [];
    return {
      slug: s.slug,
      name: s.name,
      description: s.description,
      sortOrder: s.sortOrder,
      types: types as { value: string; label?: string; description?: string }[],
      hasDimensions: Array.isArray(config.dimensions),
    };
  });

  return okWithLimit(guard.auth, data, { count: data.length });
}
