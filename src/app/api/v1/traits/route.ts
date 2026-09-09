import { prisma } from "@/lib/db";
import { guardV1, okWithLimit } from "@/lib/api-v1";

/**
 * GET /api/v1/traits — the trait axes of the survey.
 *
 * Clients need the slugs, labels, and order to render a survey and to line up a
 * `communityVector` from the profile endpoint.
 */
export async function GET(req: Request) {
  const guard = await guardV1(req);
  if (guard.response) return guard.response;

  const traits = await prisma.traitDimension.findMany({
    orderBy: { sortOrder: "asc" },
    select: {
      slug: true,
      name: true,
      description: true,
      lowLabel: true,
      highLabel: true,
      sortOrder: true,
    },
  });

  return okWithLimit(guard.auth, traits, { count: traits.length });
}
