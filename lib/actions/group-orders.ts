"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { optionalDate, optionalString, requiredString } from "@/lib/form-utils";

export async function createGroupOrderAction(formData: FormData) {
  await requireAdmin();
  const name = requiredString(formData, "name");

  const order = await prisma.groupOrder.create({
    data: {
      name,
      openedAt: optionalDate(formData, "openedAt"),
      arrivedAt: optionalDate(formData, "arrivedAt"),
      pol: optionalString(formData, "pol"),
      origin: optionalString(formData, "origin"),
      destination: optionalString(formData, "destination"),
      commodity: optionalString(formData, "commodity"),
      volumeInfo: optionalString(formData, "volumeInfo"),
      factoryLoadDate: optionalDate(formData, "factoryLoadDate"),
      statusText: optionalString(formData, "statusText"),
      statusUpdatedAt: optionalString(formData, "statusText") ? new Date() : null,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/");
  redirect(`/admin/orders/${order.id}`);
}

export async function updateGroupOrderAction(orderId: string, formData: FormData) {
  await requireAdmin();
  const name = requiredString(formData, "name");
  const newStatusText = optionalString(formData, "statusText");

  const existing = await prisma.groupOrder.findUniqueOrThrow({ where: { id: orderId } });
  const statusChanged = newStatusText !== existing.statusText;

  await prisma.groupOrder.update({
    where: { id: orderId },
    data: {
      name,
      openedAt: optionalDate(formData, "openedAt"),
      arrivedAt: optionalDate(formData, "arrivedAt"),
      pol: optionalString(formData, "pol"),
      origin: optionalString(formData, "origin"),
      destination: optionalString(formData, "destination"),
      commodity: optionalString(formData, "commodity"),
      volumeInfo: optionalString(formData, "volumeInfo"),
      factoryLoadDate: optionalDate(formData, "factoryLoadDate"),
      statusText: newStatusText,
      statusUpdatedAt: statusChanged ? new Date() : existing.statusUpdatedAt,
    },
  });

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function deleteGroupOrderAction(orderId: string) {
  await requireAdmin();
  await prisma.groupOrder.delete({ where: { id: orderId } });
  revalidatePath("/admin");
  revalidatePath("/");
  redirect("/admin");
}
