import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";
import { optionalFloat, optionalString } from "./input.js";

const completedGroupWhere: Prisma.GroupOrderWhereInput = {
  AND: [
    { canceledAt: null },
    { subOrders: { some: { status: "CLOSED" } } },
    { subOrders: { none: { status: "OPEN" } } },
  ],
};

export function buildOrderWhere(completed: boolean, q?: string, canceled = false): Prisma.GroupOrderWhereInput {
  const base: Prisma.GroupOrderWhereInput = canceled
    ? { canceledAt: { not: null } }
    : completed
      ? completedGroupWhere
      : { canceledAt: null, NOT: completedGroupWhere };
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
  subOrders: {
    orderBy: { createdAt: "asc" as const },
    include: {
      comments: { orderBy: { createdAt: "desc" as const } },
      trucks: {
        orderBy: { createdAt: "asc" as const },
        include: {
          media: { orderBy: { createdAt: "desc" as const } },
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

export async function orderVisibilityWhere(params: {
  isAdmin: boolean;
  user: { id: string; role: "CONSIGNEE" | "OPERATOR" } | null;
}): Promise<Prisma.GroupOrderWhereInput> {
  const { isAdmin, user } = params;
  if (user?.role === "CONSIGNEE") return { ownerId: user.id };
  if (user?.role === "OPERATOR") {
    const links = await prisma.operatorLink.findMany({
      where: { operatorId: user.id },
      select: { consigneeId: true },
    });
    const ids = links.map((link) => link.consigneeId);
    if (ids.length === 0) return { id: { in: [] } };
    return { ownerId: { in: ids } };
  }
  if (isAdmin) return {};
  return { id: { in: [] } };
}

export async function getViewerContext(admin: boolean, user: { id: string; role: "CONSIGNEE" | "OPERATOR" } | null) {
  if (user?.role === "CONSIGNEE") return { kind: "consignee" as const, userId: user.id };
  if (!user) {
    if (admin) return { kind: "admin" as const };
    return { kind: "guest" as const };
  }
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
  if (ctx.kind === "admin") return where;
  if (ctx.kind === "consignee") {
    if (!ctx.userId) return { AND: [where, { id: { in: [] } }] };
    return { AND: [where, { ownerId: ctx.userId }] };
  }
  if (ctx.kind === "operator") {
    if (ctx.linkedConsigneeIds.length === 0) return { AND: [where, { id: { in: [] } }] };
    return { AND: [where, { ownerId: { in: ctx.linkedConsigneeIds } }] };
  }
  return { AND: [where, { id: { in: [] } }] };
}

export function viewerCanAccessOrder(
  ctx: Awaited<ReturnType<typeof getViewerContext>>,
  ownerId: string | null
): boolean {
  if (ctx.kind === "admin") return true;
  if (ctx.kind === "consignee") return ownerId === ctx.userId;
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
      canceledAt: null,
      subOrder: { status: "OPEN", groupOrder: { canceledAt: null } },
      OR: or,
    },
    include: { subOrder: { include: { groupOrder: true } } },
  });
}

export function plateConflictMessage(
  conflict: NonNullable<Awaited<ReturnType<typeof findActivePlateConflict>>>
) {
  const where = `${conflict.subOrder.groupOrder.name} / ${conflict.subOrder.name || "sub-order"}`;
  return `This truck/trailer is still active in an open sub-order (${where}). Complete or cancel that sub-order before reusing it here.`;
}
