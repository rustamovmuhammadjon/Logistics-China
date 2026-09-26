import type { Prisma, UserRole } from "@prisma/client";
import { prisma } from "./prisma.js";
import { optionalFloat, optionalString } from "./input.js";

// A company's employee creates orders on the company's behalf — the order
// (and its operator links) belong to the company, not the employee, so
// removing an employee never touches order ownership or visibility.
export function effectiveOwnerId(user: { id: string; companyId?: string | null }): string {
  return user.companyId ?? user.id;
}

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
  subOrders: {
    orderBy: { createdAt: "asc" as const },
    include: {
      trucks: {
        orderBy: { createdAt: "asc" as const },
        include: { transfersFrom: { select: { id: true } }, track718: true },
      },
      // Just the latest comment — enough for a table cell, not the full thread.
      comments: { orderBy: { createdAt: "desc" as const }, take: 1 },
    },
  },
};

const personSelect = {
  id: true,
  email: true,
  role: true,
  companyName: true,
  firstName: true,
  lastName: true,
  phone: true,
  photoUrl: true,
  linkCode: true,
  dateOfBirth: true,
} as const;

const linksAsConsigneeSelect = {
  scope: true,
  orderGrants: { select: { groupOrderId: true } },
  operator: { select: personSelect },
} as const;

export const listIncludeWithPeople = {
  ...listInclude,
  owner: {
    select: { ...personSelect, linksAsConsignee: { select: linksAsConsigneeSelect } },
  },
  // Who actually created the order — meaningful when the owner is a
  // company and the creator is one of its employees. An employee links
  // their own operators (for the orders they create), not the company, so
  // this is also where those links live for a company-owned order.
  createdBy: {
    select: { ...personSelect, linksAsConsignee: { select: linksAsConsigneeSelect } },
  },
};

function toPerson(user: {
  id: string;
  email: string;
  role: UserRole;
  companyName: string | null;
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
    companyName: user.companyName,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    photoUrl: user.photoUrl,
    linkCode: user.linkCode,
    dateOfBirth: user.dateOfBirth ? user.dateOfBirth.toISOString() : null,
  };
}

type PersonWithLinks = {
  linksAsConsignee?: {
    scope: "ALL" | "SELECTED";
    orderGrants: { groupOrderId: string }[];
    operator: Parameters<typeof toPerson>[0];
  }[];
} & Parameters<typeof toPerson>[0];

export function withOrderPeople<T extends {
  id: string;
  owner?: null | PersonWithLinks;
  createdBy?: null | PersonWithLinks;
}>(order: T) {
  const { owner, createdBy, ...rest } = order;
  // Operator links live on whichever account actually manages them: the
  // owner for a plain consignee order, or the specific employee who created
  // it for a company-owned order (each employee links their own operators).
  const linkSource = owner?.role === "COMPANY" ? createdBy : owner;
  // Only list operators who can actually see THIS order — an ALL-scope
  // link always qualifies, a SELECTED-scope one only if explicitly granted.
  const operators = (linkSource?.linksAsConsignee ?? [])
    .filter((link) => link.scope === "ALL" || link.orderGrants.some((g) => g.groupOrderId === order.id))
    .map((link) => toPerson(link.operator));
  return {
    ...rest,
    owner: owner ? toPerson(owner) : null,
    operators,
    createdBy: createdBy ? toPerson(createdBy) : null,
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
          track718: true,
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
  user: { id: string; role: UserRole; companyId?: string | null } | null;
}): Promise<Prisma.GroupOrderWhereInput> {
  const { isAdmin, user } = params;
  if (user?.role === "CONSIGNEE" || user?.role === "COMPANY") return { ownerId: user.id };
  if (user?.role === "EMPLOYEE") return user.companyId ? { ownerId: user.companyId } : { id: { in: [] } };
  if (user?.role === "OPERATOR") {
    const links = await prisma.operatorLink.findMany({
      where: { operatorId: user.id },
      select: { id: true, consigneeId: true, scope: true, consignee: { select: { role: true } } },
    });
    if (links.length === 0) return { id: { in: [] } };

    // ALL-scope links see every order the linked account can see: for an
    // individual entrepreneur that's orders they own; for an employee
    // (who links operators for their own orders, not the whole company)
    // it's specifically the orders that employee created. SELECTED-scope
    // links only see orders explicitly granted to that specific link.
    const allScopeOwnerIds: string[] = [];
    const allScopeCreatorIds: string[] = [];
    const selectedLinkIds: string[] = [];
    for (const link of links) {
      if (link.scope === "SELECTED") {
        selectedLinkIds.push(link.id);
      } else if (link.consignee.role === "EMPLOYEE") {
        allScopeCreatorIds.push(link.consigneeId);
      } else {
        allScopeOwnerIds.push(link.consigneeId);
      }
    }

    const or: Prisma.GroupOrderWhereInput[] = [];
    if (allScopeOwnerIds.length > 0) or.push({ ownerId: { in: allScopeOwnerIds } });
    if (allScopeCreatorIds.length > 0) or.push({ createdByUserId: { in: allScopeCreatorIds } });
    if (selectedLinkIds.length > 0) {
      or.push({ operatorGrants: { some: { operatorLinkId: { in: selectedLinkIds } } } });
    }
    if (or.length === 0) return { id: { in: [] } };
    return { OR: or };
  }
  if (isAdmin) return {};
  return { id: { in: [] } };
}

export async function getViewerContext(
  admin: boolean,
  user: { id: string; role: UserRole; companyId?: string | null } | null
) {
  if (user?.role === "CONSIGNEE") return { kind: "consignee" as const, userId: user.id };
  if (user?.role === "COMPANY") return { kind: "company" as const, userId: user.id };
  if (user?.role === "EMPLOYEE") return { kind: "employee" as const, userId: user.id, companyId: user.companyId ?? "" };
  // "Company for tracking" — it never has orders of its own, so there's
  // nothing further to resolve (unlike OPERATOR below, it isn't itself
  // linked to anyone).
  if (user?.role === "OPERATOR_COMPANY") return { kind: "operatorCompany" as const, userId: user.id };
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

// gpsNumber and the track718 relation (per truck) are operator/
// operator-company/admin only — Prisma's `include` (used by listInclude/
// detailInclude, shared across every viewer role) pulls both in
// automatically, so a consignee-side response (individual, company, or
// employee) must have them stripped explicitly, from every truck of every
// sub-order, before it ever reaches res.json — hiding it in the UI alone
// would still leak it over the wire. track718's tracking number is exactly
// as sensitive as gpsNumber (it's the same kind of device identifier), so
// for now the whole relation is stripped rather than picking fields —
// revisit once track718 also carries a display-safe "last known address"
// worth showing a consignee.
export function stripGpsNumber<T extends { subOrders: Array<{ trucks: Array<Record<string, unknown>> } & Record<string, unknown>> }>(
  order: T
): T {
  return {
    ...order,
    subOrders: order.subOrders.map((sub) => ({
      ...sub,
      trucks: sub.trucks.map(({ gpsNumber: _gpsNumber, track718: _track718, ...rest }) => rest),
    })),
  } as T;
}

export function truckFields(body: Record<string, unknown>) {
  return {
    plateNumber: optionalString(body.plateNumber),
    trailerPlateNumber: optionalString(body.trailerPlateNumber),
    country: optionalString(body.country),
    driverName: optionalString(body.driverName),
    driverPhone: optionalString(body.driverPhone),
    cargoWeight: optionalFloat(body.cargoWeight),
    currentLocation: optionalString(body.currentLocation),
  };
}

/** Stamp who last touched this sub-order (covers its trucks/location too), so the consignee can see which operator edited it. */
export function touchSubOrderEditor(subOrderId: string, operatorEmail: string) {
  return prisma.subOrder.update({
    where: { id: subOrderId },
    data: { lastEditedByEmail: operatorEmail, lastEditedAt: new Date() },
  });
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
      transfersFrom: { none: {} },
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
