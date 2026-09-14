import { MAX_TRANSFERS_PER_SUB_ORDER } from "@logistics/shared";
import { prisma } from "./prisma.js";
import { badRequest, conflict, notFound } from "./errors.js";
import { findActivePlateConflict, plateConflictMessage } from "./orders.js";
import { dateOrToday, normalizePhone, normalizePlate, optionalString, requiredString, truthyFlag } from "./input.js";
import { assertSubOrderMutable } from "./lifecycle.js";

export async function createCargoTransfer(params: {
  subOrderId: string;
  body: Record<string, unknown>;
}) {
  const { subOrderId, body } = params;
  const fromTruckId = requiredString(body.fromTruckId, "fromTruckId");
  const keepTrailer = truthyFlag(body.keepTrailer);
  const comment = optionalString(body.comment);
  const transferDate = dateOrToday(body.transferDate);

  const fromTruck = await prisma.truck.findUnique({
    where: { id: fromTruckId },
    include: { transfersFrom: { select: { id: true } } },
  });
  if (!fromTruck || fromTruck.subOrderId !== subOrderId) notFound("Source truck not found");
  if (fromTruck.canceledAt) badRequest("This truck is canceled");
  if (fromTruck.transfersFrom.length > 0) {
    badRequest("This truck already transferred cargo. Use the current truck.");
  }
  await assertSubOrderMutable(subOrderId);

  const transferCount = await prisma.cargoTransfer.count({ where: { fromTruck: { subOrderId } } });
  if (transferCount >= MAX_TRANSFERS_PER_SUB_ORDER) {
    badRequest(`This sub-order has already reached the maximum of ${MAX_TRANSFERS_PER_SUB_ORDER} cargo transfers.`);
  }

  let toTruckId = optionalString(body.toTruckId);
  const toPlateRaw = optionalString(body.toPlateNumber) ?? optionalString(body.plateNumber);
  let toPlate = toPlateRaw ? normalizePlate(toPlateRaw, "toPlateNumber") : null;
  let toTrailer = keepTrailer
    ? fromTruck.trailerPlateNumber
    : optionalString(body.toTrailerPlateNumber) ?? optionalString(body.trailerPlateNumber);
  if (toTrailer) toTrailer = toTrailer.replace(/\s+/g, "").toUpperCase();

  if (keepTrailer && !fromTruck.trailerPlateNumber) {
    badRequest("This truck has no trailer to keep. Add a trailer number first, or uncheck keep-trailer.");
  }

  if (toTruckId) {
    const existing = await prisma.truck.findUnique({
      where: { id: toTruckId },
      include: { transfersFrom: { select: { id: true } } },
    });
    if (!existing || existing.subOrderId !== subOrderId) notFound("Destination truck not found");
    if (existing.canceledAt) badRequest("Destination truck is canceled");
    if (existing.transfersFrom.length > 0) badRequest("Destination truck already transferred cargo");
    if (existing.id === fromTruck.id) badRequest("Choose a different destination truck");
    toPlate = existing.plateNumber ? existing.plateNumber.replace(/\s+/g, "").toUpperCase() : toPlate;
  } else {
    if (!toPlate) badRequest("Enter the destination truck plate number");
    const trucks = await prisma.truck.findMany({
      where: { subOrderId },
      include: { transfersFrom: { select: { id: true } } },
    });
    const existing = trucks.find(
      (truck) => truck.plateNumber && truck.plateNumber.replace(/\s+/g, "").toUpperCase() === toPlate
    );
    if (existing) {
      if (existing.id === fromTruck.id) badRequest("Destination truck must be different from the source");
      if (existing.canceledAt) badRequest("Destination truck is canceled");
      if (existing.transfersFrom.length > 0) {
        badRequest("That truck already transferred cargo. Enter a new truck plate.");
      }
      toTruckId = existing.id;
    }
  }

  if (!toTruckId) {
    const clash = await findActivePlateConflict({
      plateNumber: toPlate,
      trailerPlateNumber: keepTrailer ? null : toTrailer,
      subOrderId,
      excludeTruckId: fromTruck.id,
    });
    if (clash) conflict(plateConflictMessage(clash));

    const created = await prisma.truck.create({
      data: {
        subOrderId,
        plateNumber: toPlate,
        trailerPlateNumber: toTrailer,
        country: optionalString(body.country),
        driverName: optionalString(body.driverName),
        driverPhone: optionalString(body.driverPhone) ? normalizePhone(body.driverPhone) : null,
        cargoWeight: fromTruck.cargoWeight,
      },
    });
    toTruckId = created.id;
  } else {
    const driverName = optionalString(body.driverName);
    const driverPhoneRaw = optionalString(body.driverPhone);
    const country = optionalString(body.country);
    await prisma.truck.update({
      where: { id: toTruckId },
      data: {
        cargoWeight: fromTruck.cargoWeight,
        ...(toTrailer ? { trailerPlateNumber: toTrailer } : {}),
        ...(country ? { country } : {}),
        ...(driverName ? { driverName } : {}),
        ...(driverPhoneRaw ? { driverPhone: normalizePhone(driverPhoneRaw) } : {}),
      },
    });
  }

  const snapshotFromTrailer = fromTruck.trailerPlateNumber;

  const toTruck = await prisma.truck.findUnique({ where: { id: toTruckId } });
  if (!toTruck) notFound("Destination truck not found");

  const transfer = await prisma.cargoTransfer.create({
    data: {
      fromTruckId: fromTruck.id,
      toTruckId: toTruck.id,
      keepTrailer,
      fromPlate: fromTruck.plateNumber,
      toPlate: toTruck.plateNumber,
      fromTrailer: snapshotFromTrailer,
      toTrailer: toTruck.trailerPlateNumber,
      transferDate,
      comment,
    },
    include: {
      fromTruck: { select: { id: true, plateNumber: true, trailerPlateNumber: true } },
      toTruck: { select: { id: true, plateNumber: true, trailerPlateNumber: true } },
    },
  });

  await prisma.driverAssignment.updateMany({
    where: { truckId: fromTruck.id, status: { in: ["PENDING", "ACTIVE"] } },
    data: { status: "REVOKED", pairingCodeHash: null, pairingExpiresAt: null },
  });

  return transfer;
}
