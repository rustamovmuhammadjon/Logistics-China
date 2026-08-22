import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";

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

export const listInclude = {
  subOrders: { include: { trucks: true }, orderBy: { createdAt: "asc" as const } },
};

export const detailInclude = {
  comments: { orderBy: { createdAt: "desc" as const } },
  subOrders: {
    orderBy: { createdAt: "asc" as const },
    include: {
      comments: { orderBy: { createdAt: "desc" as const } },
      trucks: {
        orderBy: { createdAt: "asc" as const },
        include: {
          media: { orderBy: { createdAt: "desc" as const } },
          comments: { orderBy: { createdAt: "desc" as const } },
          transfersFrom: { include: { toTruck: { select: { id: true, plateNumber: true } } } },
          transfersTo: { include: { fromTruck: { select: { id: true, plateNumber: true } } } },
        },
      },
    },
  },
};

export async function getViewerContext(admin: boolean, user: { id: string; role: "CONSIGNEE" | "OPERATOR" } | null) {
  if (admin) return { kind: "admin" as const };
  if (!user) return { kind: "guest" as const };
  if (user.role === "CONSIGNEE") return { kind: "consignee" as const, userId: user.id };
  const links = await prisma.operatorLink.findMany({
    where: { operatorId: user.id },
    select: { consigneeId: true },
  });
  return {
    kind: "operator" as const,
    userId: user.id,
    linkedConsigneeIds: links.map((l) => l.consigneeId),
  };
}

export async function findActivePlateConflict(params: {
  plateNumber: string | null;
  trailerPlateNumber: string | null;
  subOrderId: string;
  excludeTruckId?: string;
}) {
  const { plateNumber, trailerPlateNumber, subOrderId, excludeTruckId } = params;
  const or = [
    plateNumber ? { plateNumber: { equals: plateNumber, mode: "insensitive" as const } } : null,
    trailerPlateNumber
      ? { trailerPlateNumber: { equals: trailerPlateNumber, mode: "insensitive" as const } }
      : null,
  ].filter((clause): clause is NonNullable<typeof clause> => clause !== null);

  if (or.length === 0) return null;

  return prisma.truck.findFirst({
    where: {
      id: excludeTruckId ? { not: excludeTruckId } : undefined,
      subOrderId: { not: subOrderId },
      subOrder: { status: "OPEN" },
      OR: or,
    },
    include: { subOrder: { include: { groupOrder: true } } },
  });
}

export function plateConflictMessage(
  conflict: NonNullable<Awaited<ReturnType<typeof findActivePlateConflict>>>
) {
  const where = `${conflict.subOrder.groupOrder.name} / ${conflict.subOrder.name || "sub-order"}`;
  return `This truck/trailer is still active in an open sub-order (${where}). Close that sub-order (set its arrival date) before reusing it here.`;
}
