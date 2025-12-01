import { Prisma } from '@prisma/client';
import prisma from '../prisma/client';

export type LocationRow = {
  id: string;
  name: string;
  type: string;
  parentId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type LocationTreeNode = {
  id: string;
  name: string;
  type: string;
  parentId: string | null;
  propertyCount: number;
  children: LocationTreeNode[];
};

const normalizeName = (value: string) => value.trim();
const normalizeType = (value: string) => value.trim().toLowerCase();

const handleUniqueError = (error: unknown) => {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  ) {
    throw new Error('Location with this name already exists under the parent level');
  }

  throw error;
};

const buildPropertyCountMap = (counts: { locationId: string | null; _count: number }[]) => {
  return new Map(
    counts
      .filter((row) => row.locationId !== null)
      .map((row) => [row.locationId as string, row._count]),
  );
};

export function buildLocationTree(
  rows: LocationRow[],
  propertyCountMap: Map<string, number> = new Map(),
): LocationTreeNode[] {
  const nodes = new Map<string, LocationTreeNode>();

  rows.forEach((row) => {
    nodes.set(row.id, {
      id: row.id,
      name: row.name,
      type: row.type,
      parentId: row.parentId,
      propertyCount: propertyCountMap.get(row.id) ?? 0,
      children: [],
    });
  });

  const roots: LocationTreeNode[] = [];

  nodes.forEach((node) => {
    if (node.parentId && nodes.has(node.parentId)) {
      nodes.get(node.parentId)?.children.push(node);
    } else {
      roots.push(node);
    }
  });

  const sortNodes = (list: LocationTreeNode[]) => {
    list.sort((a, b) => a.name.localeCompare(b.name));
    list.forEach((child) => sortNodes(child.children));
  };

  sortNodes(roots);

  return roots;
}

const fetchSubtreeRows = async (locationId: string): Promise<LocationRow[]> => {
  const query = Prisma.sql`
    WITH RECURSIVE subtree AS (
      SELECT
        "id",
        "name",
        "type",
        "parentId",
        "createdAt",
        "updatedAt"
      FROM "Location"
      WHERE "id" = ${locationId}
      UNION ALL
      SELECT
        l."id",
        l."name",
        l."type",
        l."parentId",
        l."createdAt",
        l."updatedAt"
      FROM "Location" l
      JOIN subtree s ON l."parentId" = s."id"
    )
    SELECT * FROM subtree;
  `;
  return prisma.$queryRaw<LocationRow[]>(query);
};

export const getLocationTree = async (): Promise<LocationTreeNode[]> => {
  const rows = await prisma.location.findMany({
    orderBy: {
      name: 'asc',
    },
  });

  const propertyCounts = await prisma.property.groupBy({
    by: ['locationId'],
    where: {
      locationId: { not: null },
    },
    _count: {
      _all: true,
    },
  });

  const countMap = buildPropertyCountMap(
    propertyCounts.map((pc) => ({
      locationId: pc.locationId,
      _count: pc._count._all,
    }))
  );
  return buildLocationTree(
    rows.map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      parentId: row.parentId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    })),
    countMap,
  );
};

export const getLocationById = (locationId: string) => {
  return prisma.location.findUnique({
    where: { id: locationId },
  });
};

export const getLocationChildren = async (parentId: string) => {
  return prisma.location.findMany({
    where: { parentId },
    orderBy: { name: 'asc' },
  });
};

export const searchLocations = async (query: string) => {
  if (!query.trim()) return [];
  return prisma.location.findMany({
    where: {
      name: {
        contains: query,
        mode: 'insensitive',
      },
    },
    orderBy: {
      name: 'asc',
    },
    take: 50,
    select: {
      id: true,
      name: true,
      type: true,
      parentId: true,
    },
  });
};

export const createLocation = async (input: {
  name: string;
  type: string;
  parentId?: string | null;
}) => {
  const payload = {
    name: normalizeName(input.name),
    type: normalizeType(input.type),
    parentId: input.parentId || null,
  };

  if (payload.parentId) {
    const parent = await getLocationById(payload.parentId);
    if (!parent) {
      throw new Error('Parent location not found');
    }
  }

  try {
    return prisma.location.create({
      data: payload,
    });
  } catch (error) {
    handleUniqueError(error);
  }
};

export const updateLocation = async (
  id: string,
  updates: { name?: string; type?: string; parentId?: string | null },
) => {
  const normalized = {
    name: updates.name ? normalizeName(updates.name) : undefined,
    type: updates.type ? normalizeType(updates.type) : undefined,
    parentId: updates.parentId === undefined ? undefined : updates.parentId,
  };

  if (normalized.parentId) {
    const parent = await getLocationById(normalized.parentId);
    if (!parent) {
      throw new Error('Parent location not found');
    }
    if (parent.id === id) {
      throw new Error('Location cannot be its own parent');
    }

    const subtree = await getSubtreeIds(id);
    if (subtree.includes(normalized.parentId)) {
      throw new Error('Cannot move location inside its own subtree');
    }
  }

  try {
    return prisma.location.update({
      where: { id },
      data: {
        ...(normalized.name ? { name: normalized.name } : {}),
        ...(normalized.type ? { type: normalized.type } : {}),
        ...(normalized.parentId !== undefined ? { parentId: normalized.parentId } : {}),
      },
    });
  } catch (error) {
    handleUniqueError(error);
  }
};

export const deleteLocation = (id: string) => {
  return prisma.location.delete({
    where: { id },
  });
};

export const getSubtreeIds = async (id: string): Promise<string[]> => {
  const rows = await fetchSubtreeRows(id);
  return rows.map((row) => row.id);
};

export const getLocationSubtree = async (locationId: string) => {
  const rows = await fetchSubtreeRows(locationId);
  if (rows.length === 0) {
    return null;
  }

  const propertyCounts = await prisma.property.groupBy({
    by: ['locationId'],
    where: {
      locationId: { in: rows.map((row) => row.id) },
    },
    _count: {
      _all: true,
    },
  });

  const countMap = buildPropertyCountMap(
    propertyCounts.map((pc) => ({
      locationId: pc.locationId,
      _count: pc._count._all,
    }))
  );
  const tree = buildLocationTree(rows, countMap);
  const subtreePropertyCount = await countPropertiesInSubtree(locationId);

  return {
    root: rows.find((row) => row.id === locationId) ?? null,
    tree,
    propertyCount: subtreePropertyCount,
  };
};

export const countPropertiesInSubtree = async (locationId: string) => {
  const query = Prisma.sql`
    WITH RECURSIVE subtree AS (
      SELECT "id"
      FROM "Location"
      WHERE "id" = ${locationId}
      UNION ALL
      SELECT l."id"
      FROM "Location" l
      JOIN subtree s ON l."parentId" = s."id"
    )
    SELECT COUNT(*) AS "count"
    FROM "Property"
    WHERE "locationId" IN (SELECT "id" FROM subtree);
  `;
  const result = await prisma.$queryRaw<Array<{ count: bigint }>>(query);
  return Number(result[0]?.count ?? 0);
};

