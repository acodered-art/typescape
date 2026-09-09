import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Category tree.
 *
 * Recursive on purpose: the catalogue is now three levels deep
 * (Movies & TV -> Studios -> Disney), and a two-level query silently hid every
 * franchise behind an empty group. Fetched flat and assembled in memory — the
 * table is tiny and this avoids N+1 recursive queries.
 */

interface Row {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  sortOrder: number;
  icon: string | null;
  _count: { profiles: number };
}

type Node = Row & { children: Node[] };

function buildTree(rows: Row[]): Node[] {
  const byId = new Map<string, Node>(rows.map((r) => [r.id, { ...r, children: [] }]));
  const roots: Node[] = [];

  for (const node of byId.values()) {
    if (node.parentId && byId.has(node.parentId)) {
      byId.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  // Reader-friendly order: most-populated first, then alphabetical. An empty
  // category should never sit above Star Wars.
  const sort = (nodes: Node[]) => {
    nodes.sort(
      (a, b) =>
        b._count.profiles - a._count.profiles ||
        a.sortOrder - b.sortOrder ||
        a.name.localeCompare(b.name)
    );
    nodes.forEach((n) => sort(n.children));
  };
  sort(roots);

  return roots;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");

  if (slug) {
    // Slugs are inconsistent: some are bare ("disney"), some are paths
    // ("anime-manga/naruto"), and the browse URL may be a full chain
    // ("movies-tv/studios/disney"). Resolve on the last segment, which is
    // unique in this catalogue, so every shape of URL works.
    const last = slug.split("/").filter(Boolean).pop() ?? slug;
    const category =
      (await prisma.category.findUnique({
        where: { slug },
        include: {
          children: { include: { _count: { select: { profiles: true } } } },
          _count: { select: { profiles: true } },
        },
      })) ??
      (await prisma.category.findUnique({
        where: { slug: last },
        include: {
          children: { include: { _count: { select: { profiles: true } } } },
          _count: { select: { profiles: true } },
        },
      }));

    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }
    return NextResponse.json(category);
  }

  const rows = await prisma.category.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      parentId: true,
      sortOrder: true,
      icon: true,
      _count: { select: { profiles: true } },
    },
  });

  return NextResponse.json(buildTree(rows));
}
