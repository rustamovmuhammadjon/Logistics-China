"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { optionalDate, optionalString } from "@/lib/form-utils";

export async function createSubOrderAction(groupOrderId: string, formData: FormData) {
  await requireAdmin();
  const arrivedAt = optionalDate(formData, "arrivedAt");

  const subOrder = await prisma.subOrder.create({
    data: {
      groupOrderId,
      name: optionalString(formData, "name"),
      openedAt: optionalDate(formData, "openedAt"),
      arrivedAt,
      status: arrivedAt ? "CLOSED" : "OPEN",
    },
  });

  revalidatePath(`/admin/orders/${groupOrderId}`);
  revalidatePath("/");
  redirect(`/admin/orders/${groupOrderId}/suborders/${subOrder.id}`);
}

export async function updateSubOrderAction(
  groupOrderId: string,
  subOrderId: string,
  formData: FormData
) {
  await requireAdmin();
  const arrivedAt = optionalDate(formData, "arrivedAt");

  await prisma.subOrder.update({
    where: { id: subOrderId },
    data: {
      name: optionalString(formData, "name"),
      openedAt: optionalDate(formData, "openedAt"),
      arrivedAt,
      // Arriving closes the sub-order automatically; clearing the arrival
      // date re-opens it (e.g. to fix a mistaken entry).
      status: arrivedAt ? "CLOSED" : "OPEN",
    },
  });

  revalidatePath(`/admin/orders/${groupOrderId}/suborders/${subOrderId}`);
  revalidatePath(`/admin/orders/${groupOrderId}`);
  revalidatePath("/");
}

export async function deleteSubOrderAction(groupOrderId: string, subOrderId: string) {
  await requireAdmin();
  await prisma.subOrder.delete({ where: { id: subOrderId } });
  revalidatePath(`/admin/orders/${groupOrderId}`);
  revalidatePath("/");
  redirect(`/admin/orders/${groupOrderId}`);
}
