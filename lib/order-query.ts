import type { Prisma } from "@prisma/client";

export type OrderSort = "newest" | "oldest" | "location";

/**
 * A group order counts as "completed" once it has arrived — the same rule
 * already used to auto-close a sub-order (see updateSubOrderAction). No
 * separate flag needed: completed orders are just ones with arrivedAt set.
 */
export function buildOrderWhere(completed: boolean, q?: string): Prisma.GroupOrderWhereInput {
  const base: Prisma.GroupOrderWhereInput = completed ? { arrivedAt: { not: null } } : { arrivedAt: null };

  const query = q?.trim();
  if (!query) return base;

  const search: Prisma.GroupOrderWhereInput = {
    OR: [
      { name: { contains: query, mode: "insensitive" } },
      { subOrders: { some: { name: { contains: query, mode: "insensitive" } } } },
      { subOrders: { some: { trucks: { some: { plateNumber: { contains: query, mode: "insensitive" } } } } } },
      {
        subOrders: {
          some: { trucks: { some: { trailerPlateNumber: { contains: query, mode: "insensitive" } } } },
        },
      },
      { subOrders: { some: { trucks: { some: { driverPhone: { contains: query, mode: "insensitive" } } } } } },
    ],
  };

  return { AND: [base, search] };
}

export function buildOrderOrderBy(sort: string | undefined): Prisma.GroupOrderOrderByWithRelationInput {
  if (sort === "oldest") return { createdAt: "asc" };
  if (sort === "location") return { statusUpdatedAt: { sort: "desc", nulls: "last" } };
  return { createdAt: "desc" };
}

export function normalizeSort(sort: string | undefined): OrderSort {
  return sort === "oldest" || sort === "location" ? sort : "newest";
}
