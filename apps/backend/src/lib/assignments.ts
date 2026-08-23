import { prisma } from "./prisma.js";
import { badRequest, conflict, notFound, unauthorized } from "./errors.js";
import { hashPairingCode, issuePairingCode, pairingCodesMatch, pairingExpiryDate } from "./pairing.js";
import { normalizePhone, normalizePlate, optionalString } from "./input.js";
import { signDriverToken } from "./auth.js";
import { assertCanAddDirectTruck } from "./lifecycle.js";

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
  truck: { include: { subOrder: { include: { groupOrder: true } } } },
} as const;

function platesEqual(left: string | null | undefined, right: string) {
  return Boolean(left && left.replace(/\s+/g, "").toUpperCase() === right);
}

export async function findTruckInSubOrder(subOrderId: string, plateNumber: string) {
  const trucks = await prisma.truck.findMany({ where: { subOrderId, canceledAt: null } });
  return trucks.find((truck) => platesEqual(truck.plateNumber, plateNumber)) ?? null;
}

export async function createDriverAssignment(params: {
  subOrderId: string;
  plateNumber: unknown;
  phone: unknown;
  createdByUserId: string | null;
  createdByLabel: string;
}) {
  const plateNumber = normalizePlate(params.plateNumber);
  const phoneNormalized = normalizePhone(params.phone);
  const sub = await prisma.subOrder.findUnique({ where: { id: params.subOrderId } });
  if (!sub) notFound("Sub-order not found");
  if (sub.status !== "OPEN") badRequest("This sub-order is closed");

  let truck = await findTruckInSubOrder(sub.id, plateNumber);
  if (!truck) {
    await assertCanAddDirectTruck(sub.id);
    truck = await prisma.truck.create({
      data: {
        subOrderId: sub.id,
        plateNumber,
        driverPhone: optionalString(params.phone),
      },
    });
  } else {
    truck = await prisma.truck.update({
      where: { id: truck.id },
      data: { driverPhone: optionalString(params.phone) ?? truck.driverPhone },
    });
  }

  await prisma.driverAssignment.updateMany({
    where: {
      OR: [
        { truckId: truck.id, status: { in: ["PENDING", "ACTIVE"] } },
        { phoneNormalized, status: "PENDING" },
      ],
    },
    data: { status: "REVOKED", pairingCodeHash: null, pairingExpiresAt: null },
  });

  const pairingCode = issuePairingCode();
  const assignment = await prisma.driverAssignment.create({
    data: {
      truckId: truck.id,
      phoneNormalized,
      pairingCodeHash: hashPairingCode(phoneNormalized, pairingCode),
      pairingExpiresAt: pairingExpiryDate(),
      status: "PENDING",
      createdByUserId: params.createdByUserId,
      createdByLabel: params.createdByLabel,
    },
    select: assignmentPublicSelect,
  });

  return { assignment, pairingCode, truck };
}

export async function regenerateDriverAssignment(assignmentId: string, subOrderId: string) {
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
      pairingCodeHash: hashPairingCode(assignment.phoneNormalized, pairingCode),
      pairingExpiresAt: pairingExpiryDate(),
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

export async function pairDriver(phone: unknown, code: unknown) {
  const phoneNormalized = normalizePhone(phone);
  const pairingCode = String(code ?? "").replace(/\s+/g, "");
  if (!/^\d{6}$/.test(pairingCode)) unauthorized("Phone or code is not valid");

  const candidates = await prisma.driverAssignment.findMany({
    where: {
      phoneNormalized,
      status: "PENDING",
      pairingCodeHash: { not: null },
      pairingExpiresAt: { gt: new Date() },
    },
    include: driverTruckInclude,
    orderBy: { createdAt: "desc" },
  });

  const match = candidates.find(
    (row) => row.pairingCodeHash && pairingCodesMatch(row.pairingCodeHash, phoneNormalized, pairingCode)
  );
  if (!match) unauthorized("Phone or code is not valid");
  if (match.truck.canceledAt) unauthorized("This truck is canceled");
  if (match.truck.subOrder.status !== "OPEN") unauthorized("This trip is already closed");

  await prisma.driverAssignment.updateMany({
    where: {
      phoneNormalized,
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
    phoneNormalized: assignment.phoneNormalized,
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
    truck: { canceledAt: Date | null; subOrder: { status: string } };
  },
  tokenVersion: number
) {
  if (assignment.status !== "ACTIVE") unauthorized("This pairing is no longer active");
  if (assignment.tokenVersion !== tokenVersion) unauthorized("Sign in again with a new code");
  if (assignment.truck.canceledAt) unauthorized("This truck is canceled");
  if (assignment.truck.subOrder.status !== "OPEN") unauthorized("This trip is already closed");
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
    include: { truck: { include: { subOrder: true } } },
  });
  if (!assignment) unauthorized();
  if (assignment.status !== "ACTIVE") unauthorized("This pairing is no longer active");
  if (assignment.truck.canceledAt) unauthorized("This truck is canceled");
  if (assignment.truck.subOrder.status !== "OPEN") unauthorized("This trip is already closed");

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
