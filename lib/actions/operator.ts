"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireOperator, requireOperatorLinkedTo } from "@/lib/current-user";
import { optionalString, requiredString } from "@/lib/form-utils";

type CommentTarget =
  | { level: "group"; groupOrderId: string }
  | { level: "sub"; groupOrderId: string; subOrderId: string }
  | { level: "truck"; groupOrderId: string; subOrderId: string; truckId: string };

export async function updateOrderLocationAction(groupOrderId: string, formData: FormData) {
  const me = await requireOperator();
  const order = await prisma.groupOrder.findUniqueOrThrow({ where: { id: groupOrderId } });
  await requireOperatorLinkedTo(me.id, order.ownerId);

  const statusText = optionalString(formData, "statusText");
  const changed = statusText !== order.statusText;

  await prisma.groupOrder.update({
    where: { id: groupOrderId },
    data: {
      statusText,
      statusUpdatedAt: changed ? new Date() : order.statusUpdatedAt,
    },
  });

  revalidatePath(`/dashboard/orders/${groupOrderId}`);
  revalidatePath("/");
}

export async function updateTruckLocationAction(
  groupOrderId: string,
  truckId: string,
  formData: FormData
) {
  const me = await requireOperator();
  const order = await prisma.groupOrder.findUniqueOrThrow({ where: { id: groupOrderId } });
  await requireOperatorLinkedTo(me.id, order.ownerId);

  const truck = await prisma.truck.findUniqueOrThrow({
    where: { id: truckId },
    include: { subOrder: true },
  });
  if (truck.subOrder.groupOrderId !== groupOrderId) {
    throw new Error("Not authorized");
  }

  const currentLocation = optionalString(formData, "currentLocation");
  const changed = currentLocation !== truck.currentLocation;

  await prisma.truck.update({
    where: { id: truckId },
    data: {
      currentLocation,
      locationUpdatedAt: changed ? new Date() : truck.locationUpdatedAt,
    },
  });

  revalidatePath(`/dashboard/orders/${groupOrderId}`);
  revalidatePath("/");
}

export async function addOperatorCommentAction(target: CommentTarget, formData: FormData) {
  const me = await requireOperator();
  const order = await prisma.groupOrder.findUniqueOrThrow({ where: { id: target.groupOrderId } });
  await requireOperatorLinkedTo(me.id, order.ownerId);

  const text = requiredString(formData, "text");

  await prisma.comment.create({
    data: {
      text,
      author: me.email,
      groupOrderId: target.level === "group" ? target.groupOrderId : undefined,
      subOrderId: target.level === "sub" ? target.subOrderId : undefined,
      truckId: target.level === "truck" ? target.truckId : undefined,
    },
  });

  revalidatePath(`/dashboard/orders/${target.groupOrderId}`);
}
