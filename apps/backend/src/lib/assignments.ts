import { prisma } from "./prisma.js";
import { badRequest, conflict, notFound, unauthorized } from "./errors.js";
import {
  CODE_PATTERN,
  hashPairingCode,
  issuePairingCode,
  normalizePairingDuration,
  pairingExpiryDate,
} from "./pairing.js";
import { normalizePlate } from "./input.js";
import { signDriverToken } from "./auth.js";
import { assertCanAddDirectTruck, assertSubOrderMutable } from "./lifecycle.js";

export const assignmentPublicSelect = {
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
} as const;

const driverTruckInclude = {
  truck: {
    include: {
      transfersFrom: { select: { id: true } },
      subOrder: { include: { groupOrder: true } },
    },
  },
} as const;

function platesEqual(left: string | null | undefined, right: string) {
  return Boolean(left && left.replace(/\s+/g, "").toUpperCase() === right);
}

export async function findTruckInSubOrder(subOrderId: string, plateNumber: string) {
  const trucks = await prisma.truck.findMany({
    where: { subOrderId, canceledAt: null, transfersFrom: { none: {} } },
  });
  return trucks.find((truck) => platesEqual(truck.plateNumber, plateNumber)) ?? null;
}

export async function createDriverAssignment(params: {
  subOrderId: string;
  plateNumber: unknown;
  expiresInMinutes: unknown;
  createdByUserId: string | null;
  createdByLabel: string;
}) {
  const plateNumber = normalizePlate(params.plateNumber);
  const expiresInMinutes = normalizePairingDuration(params.expiresInMinutes);
  const sub = await prisma.subOrder.findUnique({ where: { id: params.subOrderId } });
  if (!sub) notFound("Sub-order not found");
  await assertSubOrderMutable(sub.id);

  let truck = await findTruckInSubOrder(sub.id, plateNumber);
  if (!truck) {
    await assertCanAddDirectTruck(sub.id);
    truck = await prisma.truck.create({
      data: { subOrderId: sub.id, plateNumber },
    });
  }

  await prisma.driverAssignment.updateMany({
    where: { truckId: truck.id, status: { in: ["PENDING", "ACTIVE"] } },
    data: { status: "REVOKED", pairingCodeHash: null, pairingExpiresAt: null },
  });

  const pairingCode = issuePairingCode();
  const assignment = await prisma.driverAssignment.create({
    data: {
      truckId: truck.id,
      pairingCodeHash: hashPairingCode(pairingCode),
      pairingExpiresAt: pairingExpiryDate(expiresInMinutes),
      status: "PENDING",
      createdByUserId: params.createdByUserId,
      createdByLabel: params.createdByLabel,
    },
    select: assignmentPublicSelect,
  });

  return { assignment, pairingCode, truck };
}

export async function regenerateDriverAssignment(
  assignmentId: string,
  subOrderId: string,
  expiresInMinutesRaw: unknown
) {
  const expiresInMinutes = normalizePairingDuration(expiresInMinutesRaw);
  const assignment = await prisma.driverAssignment.findUnique({
    where: { id: assignmentId },
    include: { truck: true },
  });
  if (!assignment || assignment.truck.subOrderId !== subOrderId) notFound();
  if (assignment.status === "REVOKED") badRequest("This pairing was revoked");

  const pairingCode = issuePairingCode();
  const updated = await prisma.driverAssignment.update({
    where: { id: assignment.id },
    data: {
      status: "PENDING",
      claimedAt: null,
      tokenVersion: { increment: 1 },
      pairingCodeHash: hashPairingCode(pairingCode),
      pairingExpiresAt: pairingExpiryDate(expiresInMinutes),
    },
    select: assignmentPublicSelect,
  });
  return { assignment: updated, pairingCode };
}

export async function revokeDriverAssignment(assignmentId: string, subOrderId: string) {
  const assignment = await prisma.driverAssignment.findUnique({
    where: { id: assignmentId },
    include: { truck: true },
  });
  if (!assignment || assignment.truck.subOrderId !== subOrderId) notFound();
  await prisma.driverAssignment.update({
    where: { id: assignment.id },
    data: {
      status: "REVOKED",
      pairingCodeHash: null,
      pairingExpiresAt: null,
      tokenVersion: { increment: 1 },
    },
  });
}

// The driver's own "sign out of this phone" action — same end state as an
// operator/admin revoking the pairing, just self-service and scoped to
// whichever assignment their own JWT already names (requireDriver already
// proved they hold a valid token for exactly this assignment, so there's no
// separate ownership check to make here).
export async function unpairDriver(assignmentId: string) {
  await prisma.driverAssignment.update({
    where: { id: assignmentId },
    data: {
      status: "REVOKED",
      pairingCodeHash: null,
      pairingExpiresAt: null,
      tokenVersion: { increment: 1 },
    },
  });
}

export async function pairDriver(code: unknown) {
  const pairingCode = String(code ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
  if (!CODE_PATTERN.test(pairingCode)) unauthorized("Code is not valid");

  const match = await prisma.driverAssignment.findFirst({
    where: {
      pairingCodeHash: hashPairingCode(pairingCode),
      status: "PENDING",
      pairingExpiresAt: { gt: new Date() },
    },
    include: driverTruckInclude,
    orderBy: { createdAt: "desc" },
  });
  if (!match) unauthorized("Code is not valid or has expired");
  if (match.truck.canceledAt) unauthorized("This truck is canceled");
  if (match.truck.subOrder.status !== "OPEN") unauthorized("This trip is already closed");

  await prisma.driverAssignment.updateMany({
    where: {
      truckId: match.truckId,
      id: { not: match.id },
      status: { in: ["PENDING", "ACTIVE"] },
    },
    data: { status: "REVOKED", pairingCodeHash: null, pairingExpiresAt: null },
  });

  const assignment = await prisma.driverAssignment.update({
    where: { id: match.id },
    data: {
      status: "ACTIVE",
      claimedAt: new Date(),
      pairingCodeHash: null,
      pairingExpiresAt: null,
      tokenVersion: { increment: 1 },
    },
    include: driverTruckInclude,
  });

  const token = await signDriverToken({
    assignmentId: assignment.id,
    truckId: assignment.truckId,
    tokenVersion: assignment.tokenVersion,
  });

  return { token, assignment };
}

export function toDriverMe(assignment: Awaited<ReturnType<typeof pairDriver>>["assignment"]) {
  return {
    assignmentId: assignment.id,
    status: assignment.status,
    lastLat: assignment.lastLat,
    lastLng: assignment.lastLng,
    lastLocationText: assignment.lastLocationText,
    lastPingAt: assignment.lastPingAt,
    truck: {
      id: assignment.truck.id,
      plateNumber: assignment.truck.plateNumber,
      trailerPlateNumber: assignment.truck.trailerPlateNumber,
      currentLocation: assignment.truck.currentLocation,
      locationUpdatedAt: assignment.truck.locationUpdatedAt,
      subOrderName: assignment.truck.subOrder.name,
      orderName: assignment.truck.subOrder.groupOrder.name,
      subOrderStatus: assignment.truck.subOrder.status,
    },
  };
}

export function assertAssignmentUsable(
  assignment: {
    status: string;
    tokenVersion: number;
    truck: {
      canceledAt: Date | null;
      transfersFrom?: { id: string }[];
      subOrder: { status: string; groupOrder?: { canceledAt: Date | null } | null };
    };
  },
  tokenVersion: number
) {
  if (assignment.status !== "ACTIVE") unauthorized("This pairing is no longer active");
  if (assignment.tokenVersion !== tokenVersion) unauthorized("Sign in again with a new code");
  if (assignment.truck.canceledAt) unauthorized("This truck is canceled");
  if (assignment.truck.transfersFrom && assignment.truck.transfersFrom.length > 0) {
    unauthorized("This truck already transferred cargo");
  }
  if (assignment.truck.subOrder.status !== "OPEN") unauthorized("This trip is already closed");
  if (assignment.truck.subOrder.groupOrder?.canceledAt) unauthorized("This order is canceled");
}

export function formatGpsLabel(lat: number, lng: number, locationText?: string | null) {
  const coords = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  return locationText?.trim() ? `${locationText.trim()} (${coords})` : coords;
}

export async function recordDriverPing(params: {
  assignmentId: string;
  lat: number;
  lng: number;
  accuracy: number | null;
  locationText: string | null;
}) {
  const { assignmentId, lat, lng, accuracy, locationText } = params;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) badRequest("Coordinates are out of range");

  const assignment = await prisma.driverAssignment.findUnique({
    where: { id: assignmentId },
    include: {
      truck: {
        include: {
          transfersFrom: { select: { id: true } },
          subOrder: { include: { groupOrder: true } },
        },
      },
    },
  });
  if (!assignment) unauthorized();
  if (assignment.status !== "ACTIVE") unauthorized("This pairing is no longer active");
  if (assignment.truck.canceledAt) unauthorized("This truck is canceled");
  if (assignment.truck.transfersFrom.length > 0) unauthorized("This truck already transferred cargo");
  if (assignment.truck.subOrder.status !== "OPEN") unauthorized("This trip is already closed");
  if (assignment.truck.subOrder.groupOrder.canceledAt) unauthorized("This order is canceled");

  if (assignment.lastPingAt && Date.now() - assignment.lastPingAt.getTime() < 60_000) {
    conflict("Location was just sent. Wait a minute before sending again.");
  }

  const label = formatGpsLabel(lat, lng, locationText);
  const now = new Date();

  await prisma.locationPing.create({
    data: { assignmentId, lat, lng, accuracy, locationText: label },
  });
  await prisma.driverAssignment.update({
    where: { id: assignmentId },
    data: { lastLat: lat, lastLng: lng, lastLocationText: label, lastPingAt: now },
  });
  await prisma.truck.update({
    where: { id: assignment.truckId },
    data: {
      currentLocation: label,
      locationUpdatedAt: now,
      lastLat: lat,
      lastLng: lng,
    },
  });

  return { lastPingAt: now, lastLocationText: label };
}

export async function loadActiveDriver(assignmentId: string, tokenVersion: number) {
  const assignment = await prisma.driverAssignment.findUnique({
    where: { id: assignmentId },
    include: driverTruckInclude,
  });
  if (!assignment) unauthorized();
  assertAssignmentUsable(assignment, tokenVersion);
  return assignment;
}
