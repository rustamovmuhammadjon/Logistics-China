import { prisma } from "./prisma.js";
import { badRequest, conflict, notFound } from "./errors.js";
import { findActivePlateConflict, plateConflictMessage } from "./orders.js";
import { normalizePhone, normalizePlate, optionalDate, optionalString, requiredString, truthyFlag } from "./input.js";
import { assertSubOrderNotCanceled } from "./lifecycle.js";

export async function createCargoTransfer(params: {
  subOrderId: string;
  body: Record<string, unknown>;
}) {
  const { subOrderId, body } = params;
  const fromTruckId = requiredString(body.fromTruckId, "fromTruckId");
  const keepTrailer = truthyFlag(body.keepTrailer);
  const comment = optionalString(body.comment);
  const transferDate = optionalDate(body.transferDate);

  const fromTruck = await prisma.truck.findUnique({ where: { id: fromTruckId } });
  if (!fromTruck || fromTruck.subOrderId !== subOrderId) notFound("Source truck not found");
  if (fromTruck.canceledAt) badRequest("This truck is canceled");
  await assertSubOrderNotCanceled(subOrderId);

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
    const existing = await prisma.truck.findUnique({ where: { id: toTruckId } });
    if (!existing || existing.subOrderId !== subOrderId) notFound("Destination truck not found");
    if (existing.canceledAt) badRequest("Destination truck is canceled");
    if (existing.id === fromTruck.id) badRequest("Choose a different destination truck");
    toPlate = existing.plateNumber ? existing.plateNumber.replace(/\s+/g, "").toUpperCase() : toPlate;
  } else {
    if (!toPlate) badRequest("Enter the destination truck plate number");
    const trucks = await prisma.truck.findMany({ where: { subOrderId, canceledAt: null } });
    const existing = trucks.find(
      (truck) => truck.plateNumber && truck.plateNumber.replace(/\s+/g, "").toUpperCase() === toPlate
    );
    if (existing) {
      if (existing.id === fromTruck.id) badRequest("Destination truck must be different from the source");
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
        driverName: optionalString(body.driverName),
        driverPhone: optionalString(body.driverPhone) ? normalizePhone(body.driverPhone) : null,
        cargoWeight: fromTruck.cargoWeight,
        cargoDescription: fromTruck.cargoDescription,
        lengthM: fromTruck.lengthM,
        widthM: fromTruck.widthM,
        heightM: fromTruck.heightM,
      },
    });
    toTruckId = created.id;
  } else if (keepTrailer || toTrailer) {
    await prisma.truck.update({
      where: { id: toTruckId },
      data: {
        trailerPlateNumber: toTrailer,
        driverName: optionalString(body.driverName) ?? undefined,
        driverPhone: optionalString(body.driverPhone) ? normalizePhone(body.driverPhone) : undefined,
      },
    });
  }

  const snapshotFromTrailer = fromTruck.trailerPlateNumber;
  if (keepTrailer) {
    await prisma.truck.update({
      where: { id: fromTruck.id },
      data: { trailerPlateNumber: null },
    });
  }

  const toTruck = await prisma.truck.findUnique({ where: { id: toTruckId } });
  if (!toTruck) notFound("Destination truck not found");

  return prisma.cargoTransfer.create({
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
}
