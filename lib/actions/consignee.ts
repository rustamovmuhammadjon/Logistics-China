"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireConsignee } from "@/lib/current-user";
import { optionalDate, optionalString, requiredString } from "@/lib/form-utils";

async function requireOwnedOrder(orderId: string, consigneeId: string) {
  const order = await prisma.groupOrder.findUnique({ where: { id: orderId } });
  if (!order || order.ownerId !== consigneeId) {
    throw new Error("Not authorized");
  }
  return order;
}

export async function createOwnedGroupOrderAction(formData: FormData) {
  const me = await requireConsignee();
  const name = requiredString(formData, "name");

  const order = await prisma.groupOrder.create({
    data: {
      ownerId: me.id,
      name,
      openedAt: optionalDate(formData, "openedAt"),
      arrivedAt: optionalDate(formData, "arrivedAt"),
      pol: optionalString(formData, "pol"),
      origin: optionalString(formData, "origin"),
      destination: optionalString(formData, "destination"),
      commodity: optionalString(formData, "commodity"),
      volumeInfo: optionalString(formData, "volumeInfo"),
      factoryLoadDate: optionalDate(formData, "factoryLoadDate"),
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/");
  redirect(`/dashboard/orders/${order.id}`);
}

export async function updateOwnedGroupOrderAction(orderId: string, formData: FormData) {
  const me = await requireConsignee();
  await requireOwnedOrder(orderId, me.id);
  const name = requiredString(formData, "name");

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
    },
  });

  revalidatePath(`/dashboard/orders/${orderId}`);
  revalidatePath("/dashboard");
  revalidatePath("/");
}

export async function deleteOwnedGroupOrderAction(orderId: string) {
  const me = await requireConsignee();
  await requireOwnedOrder(orderId, me.id);

  await prisma.groupOrder.delete({ where: { id: orderId } });
  revalidatePath("/dashboard");
  revalidatePath("/");
  redirect("/dashboard");
}

export async function createOwnedSubOrderAction(groupOrderId: string, formData: FormData) {
  const me = await requireConsignee();
  await requireOwnedOrder(groupOrderId, me.id);

  const arrivedAt = optionalDate(formData, "arrivedAt");
  await prisma.subOrder.create({
    data: {
      groupOrderId,
      name: optionalString(formData, "name"),
      openedAt: optionalDate(formData, "openedAt"),
      arrivedAt,
      status: arrivedAt ? "CLOSED" : "OPEN",
    },
  });

  revalidatePath(`/dashboard/orders/${groupOrderId}`);
  revalidatePath("/");
}

export async function updateOwnedSubOrderAction(
  groupOrderId: string,
  subOrderId: string,
  formData: FormData
) {
  const me = await requireConsignee();
  await requireOwnedOrder(groupOrderId, me.id);

  const arrivedAt = optionalDate(formData, "arrivedAt");
  await prisma.subOrder.update({
    where: { id: subOrderId },
    data: {
      name: optionalString(formData, "name"),
      openedAt: optionalDate(formData, "openedAt"),
      arrivedAt,
      status: arrivedAt ? "CLOSED" : "OPEN",
    },
  });

  revalidatePath(`/dashboard/orders/${groupOrderId}`);
  revalidatePath("/");
}

export async function deleteOwnedSubOrderAction(groupOrderId: string, subOrderId: string) {
  const me = await requireConsignee();
  await requireOwnedOrder(groupOrderId, me.id);

  await prisma.subOrder.delete({ where: { id: subOrderId } });
  revalidatePath(`/dashboard/orders/${groupOrderId}`);
  revalidatePath("/");
}
