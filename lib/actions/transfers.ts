"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { optionalDate, optionalString, requiredString } from "@/lib/form-utils";

export async function createTransferAction(
  groupOrderId: string,
  subOrderId: string,
  formData: FormData
) {
  await requireAdmin();
  const fromTruckId = requiredString(formData, "fromTruckId");
  const toTruckId = requiredString(formData, "toTruckId");

  if (fromTruckId === toTruckId) {
    // Silently ignore instead of crashing the page with an error boundary.
    return;
  }

  await prisma.cargoTransfer.create({
    data: {
      fromTruckId,
      toTruckId,
      transferDate: optionalDate(formData, "transferDate"),
      comment: optionalString(formData, "comment"),
    },
  });

  revalidatePath(`/admin/orders/${groupOrderId}/suborders/${subOrderId}`);
  revalidatePath(
    `/admin/orders/${groupOrderId}/suborders/${subOrderId}/trucks/${fromTruckId}`
  );
  revalidatePath(`/admin/orders/${groupOrderId}/suborders/${subOrderId}/trucks/${toTruckId}`);
  revalidatePath("/");
}

export async function deleteTransferAction(
  groupOrderId: string,
  subOrderId: string,
  transferId: string
) {
  await requireAdmin();
  await prisma.cargoTransfer.delete({ where: { id: transferId } });
  revalidatePath(`/admin/orders/${groupOrderId}/suborders/${subOrderId}`);
  revalidatePath("/");
}
