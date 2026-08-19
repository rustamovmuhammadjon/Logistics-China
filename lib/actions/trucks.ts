"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { optionalFloat, optionalString } from "@/lib/form-utils";
import type { PaymentStatus } from "@prisma/client";

function paths(groupOrderId: string, subOrderId: string, truckId?: string) {
  revalidatePath(`/admin/orders/${groupOrderId}/suborders/${subOrderId}`);
  revalidatePath(`/admin/orders/${groupOrderId}`);
  revalidatePath("/admin");
  revalidatePath("/");
  if (truckId) {
    revalidatePath(`/admin/orders/${groupOrderId}/suborders/${subOrderId}/trucks/${truckId}`);
  }
}

/**
 * A truck/trailer currently working an open sub-order can't be assigned to a
 * different sub-order until the original one is closed (arrived). Returns the
 * conflicting truck (with its sub-order/group-order) if the plate or trailer
 * plate is already active elsewhere, or null if it's free to use.
 */
async function findActiveConflict(params: {
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

function conflictMessage(
  conflict: NonNullable<Awaited<ReturnType<typeof findActiveConflict>>>
) {
  const where = `${conflict.subOrder.groupOrder.name} / ${conflict.subOrder.name || "sub-order"}`;
  return `This truck/trailer is still active in an open sub-order (${where}). Close that sub-order (set its arrival date) before reusing it here.`;
}

export async function createTruckAction(
  groupOrderId: string,
  subOrderId: string,
  formData: FormData
) {
  await requireAdmin();

  const plateNumber = optionalString(formData, "plateNumber");
  const trailerPlateNumber = optionalString(formData, "trailerPlateNumber");

  const conflict = await findActiveConflict({ plateNumber, trailerPlateNumber, subOrderId });
  if (conflict) {
    redirect(
      `/admin/orders/${groupOrderId}/suborders/${subOrderId}?truckError=${encodeURIComponent(
        conflictMessage(conflict)
      )}`
    );
  }

  const currentLocation = optionalString(formData, "currentLocation");

  const truck = await prisma.truck.create({
    data: {
      subOrderId,
      plateNumber,
      trailerPlateNumber,
      driverName: optionalString(formData, "driverName"),
      driverPhone: optionalString(formData, "driverPhone"),
      lengthM: optionalFloat(formData, "lengthM"),
      widthM: optionalFloat(formData, "widthM"),
      heightM: optionalFloat(formData, "heightM"),
      cargoWeight: optionalFloat(formData, "cargoWeight"),
      cargoDescription: optionalString(formData, "cargoDescription"),
      currentLocation,
      locationUpdatedAt: currentLocation ? new Date() : null,
    },
  });

  paths(groupOrderId, subOrderId, truck.id);
  redirect(`/admin/orders/${groupOrderId}/suborders/${subOrderId}/trucks/${truck.id}`);
}

export async function updateTruckAction(
  groupOrderId: string,
  subOrderId: string,
  truckId: string,
  formData: FormData
) {
  await requireAdmin();

  const plateNumber = optionalString(formData, "plateNumber");
  const trailerPlateNumber = optionalString(formData, "trailerPlateNumber");

  const conflict = await findActiveConflict({
    plateNumber,
    trailerPlateNumber,
    subOrderId,
    excludeTruckId: truckId,
  });
  if (conflict) {
    redirect(
      `/admin/orders/${groupOrderId}/suborders/${subOrderId}/trucks/${truckId}?truckError=${encodeURIComponent(
        conflictMessage(conflict)
      )}`
    );
  }

  const existing = await prisma.truck.findUniqueOrThrow({ where: { id: truckId } });
  const newLocation = optionalString(formData, "currentLocation");
  const locationChanged = newLocation !== existing.currentLocation;

  await prisma.truck.update({
    where: { id: truckId },
    data: {
      plateNumber,
      trailerPlateNumber,
      driverName: optionalString(formData, "driverName"),
      driverPhone: optionalString(formData, "driverPhone"),
      lengthM: optionalFloat(formData, "lengthM"),
      widthM: optionalFloat(formData, "widthM"),
      heightM: optionalFloat(formData, "heightM"),
      cargoWeight: optionalFloat(formData, "cargoWeight"),
      cargoDescription: optionalString(formData, "cargoDescription"),
      currentLocation: newLocation,
      locationUpdatedAt: locationChanged ? new Date() : existing.locationUpdatedAt,
    },
  });

  paths(groupOrderId, subOrderId, truckId);
}

export async function updateTruckPaymentAction(
  groupOrderId: string,
  subOrderId: string,
  truckId: string,
  field: "driverPaymentStatus" | "customerPaymentStatus",
  value: PaymentStatus
) {
  await requireAdmin();
  await prisma.truck.update({
    where: { id: truckId },
    data: { [field]: value },
  });

  paths(groupOrderId, subOrderId, truckId);
}

export async function deleteTruckAction(
  groupOrderId: string,
  subOrderId: string,
  truckId: string
) {
  await requireAdmin();
  await prisma.truck.delete({ where: { id: truckId } });
  paths(groupOrderId, subOrderId);
  redirect(`/admin/orders/${groupOrderId}/suborders/${subOrderId}`);
}
