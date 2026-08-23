import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";
import { optionalFloat, optionalString } from "./input.js";

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

const personSelect = {
  id: true,
  email: true,
  role: true,
  firstName: true,
  lastName: true,
  phone: true,
  photoUrl: true,
  linkCode: true,
  dateOfBirth: true,
} as const;

export const listIncludeWithPeople = {
  ...listInclude,
  owner: {
    select: {
      ...personSelect,
      linksAsConsignee: { select: { operator: { select: personSelect } } },
    },
  },
};

function toPerson(user: {
  id: string;
  email: string;
  role: "CONSIGNEE" | "OPERATOR";
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  photoUrl: string | null;
  linkCode: string;
  dateOfBirth: Date | null;
}) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    photoUrl: user.photoUrl,
    linkCode: user.linkCode,
    dateOfBirth: user.dateOfBirth ? user.dateOfBirth.toISOString() : null,
  };
}

export function withOrderPeople<T extends { owner?: null | {
  linksAsConsignee?: { operator: Parameters<typeof toPerson>[0] }[];
} & Parameters<typeof toPerson>[0] }>(order: T) {
  const { owner, ...rest } = order;
  return {
    ...rest,
    owner: owner ? toPerson(owner) : null,
    operators: owner?.linksAsConsignee?.map((link) => toPerson(link.operator)) ?? [],
  };
}

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
          transfersFrom: {
            include: { toTruck: { select: { id: true, plateNumber: true, trailerPlateNumber: true } } },
          },
          transfersTo: {
            include: { fromTruck: { select: { id: true, plateNumber: true, trailerPlateNumber: true } } },
          },
          assignments: {
            where: { status: { in: ["PENDING", "ACTIVE"] as Array<"PENDING" | "ACTIVE"> } },
            orderBy: { createdAt: "desc" as const },
            select: {
              id: true,
              truckId: true,
              phoneNormalized: true,
              status: true,
              claimedAt: true,
              lastLat: true,
              lastLng: true,
              lastLocationText: true,
              lastPingAt: true,
              pairingExpiresAt: true,
              createdAt: true,
              createdByLabel: true,
            },
          },
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

export function scopeOrderWhere(
  ctx: Awaited<ReturnType<typeof getViewerContext>>,
  where: Prisma.GroupOrderWhereInput
): Prisma.GroupOrderWhereInput {
  if (ctx.kind !== "operator") return where;
  if (ctx.linkedConsigneeIds.length === 0) return { AND: [where, { id: { in: [] } }] };
  return { AND: [where, { ownerId: { in: ctx.linkedConsigneeIds } }] };
}

export function viewerCanAccessOrder(
  ctx: Awaited<ReturnType<typeof getViewerContext>>,
  ownerId: string | null
): boolean {
  if (ctx.kind === "admin") return true;
  if (ctx.kind === "consignee") return true;
  if (ctx.kind === "operator") return Boolean(ownerId && ctx.linkedConsigneeIds.includes(ownerId));
  return false;
}

export function truckFields(body: Record<string, unknown>) {
  return {
    plateNumber: optionalString(body.plateNumber),
    trailerPlateNumber: optionalString(body.trailerPlateNumber),
    driverName: optionalString(body.driverName),
    driverPhone: optionalString(body.driverPhone),
    lengthM: optionalFloat(body.lengthM),
    widthM: optionalFloat(body.widthM),
    heightM: optionalFloat(body.heightM),
    cargoWeight: optionalFloat(body.cargoWeight),
    cargoDescription: optionalString(body.cargoDescription),
    currentLocation: optionalString(body.currentLocation),
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
