import { prisma } from "./prisma.js";
import { badRequest, notFound } from "./errors.js";
import { removePublicFiles } from "./supabase.js";

export async function assertGroupOrderActive(orderId: string) {
  const order = await prisma.groupOrder.findUnique({ where: { id: orderId } });
  if (!order) notFound();
  if (order.canceledAt) badRequest("This order is canceled");
  return order;
}

export async function assertGroupOrderMutable(orderId: string) {
  const order = await prisma.groupOrder.findUnique({
    where: { id: orderId },
    include: { subOrders: { select: { status: true } } },
  });
  if (!order) notFound();
  if (order.canceledAt) badRequest("This order is canceled and cannot be changed");
  const hasOpen = order.subOrders.some((sub) => sub.status === "OPEN");
  const hasClosed = order.subOrders.some((sub) => sub.status === "CLOSED");
  if (hasClosed && !hasOpen) badRequest("This order is completed and cannot be changed");
  return order;
}

export async function assertSubOrderNotCanceled(subOrderId: string) {
  const sub = await prisma.subOrder.findUnique({ where: { id: subOrderId } });
  if (!sub) notFound("Sub-order not found");
  if (sub.status === "CANCELED") badRequest("This sub-order is canceled");
  return sub;
}

export async function assertSubOrderOpen(subOrderId: string) {
  const sub = await assertSubOrderNotCanceled(subOrderId);
  if (sub.status === "CLOSED") badRequest("This sub-order is completed");
  return sub;
}

export async function assertSubOrderMutable(subOrderId: string) {
  const sub = await assertSubOrderOpen(subOrderId);
  await assertGroupOrderMutable(sub.groupOrderId);
  return sub;
}

export async function countActiveTrucks(subOrderId: string) {
  return prisma.truck.count({
    where: { subOrderId, canceledAt: null, transfersFrom: { none: {} } },
  });
}

export async function assertCanAddDirectTruck(subOrderId: string) {
  await assertSubOrderMutable(subOrderId);
  const active = await countActiveTrucks(subOrderId);
  if (active > 0) {
    badRequest("This sub-order already has a truck. Record a cargo transfer to add another truck.");
  }
}

export async function assertTruckNotFrozen(truckId: string, subOrderId?: string) {
  const truck = await prisma.truck.findUnique({
    where: { id: truckId },
    include: {
      transfersFrom: { select: { id: true } },
      subOrder: true,
    },
  });
  if (!truck) notFound("Truck not found");
  if (subOrderId && truck.subOrderId !== subOrderId) notFound("Truck not found");
  if (truck.canceledAt) badRequest("This truck is canceled");
  if (truck.transfersFrom.length > 0) {
    badRequest("This truck already transferred cargo and cannot be changed");
  }
  return truck;
}

export async function assertTruckMutable(truckId: string, subOrderId?: string) {
  const truck = await assertTruckNotFrozen(truckId, subOrderId);
  await assertSubOrderMutable(truck.subOrderId);
  return truck;
}

export async function cancelGroupOrder(id: string) {
  const existing = await prisma.groupOrder.findUnique({ where: { id } });
  if (!existing) notFound();
  if (existing.canceledAt) return existing;
  return prisma.groupOrder.update({
    where: { id },
    data: { canceledAt: new Date() },
  });
}

export async function cancelSubOrder(id: string, groupOrderId: string) {
  const existing = await prisma.subOrder.findUnique({ where: { id } });
  if (!existing || existing.groupOrderId !== groupOrderId) notFound();
  if (existing.status === "CANCELED") return existing;
  return prisma.subOrder.update({
    where: { id },
    data: { status: "CANCELED" },
  });
}

export async function cancelTruck(id: string, subOrderId: string) {
  const existing = await prisma.truck.findUnique({
    where: { id },
    include: { transfersFrom: { select: { id: true } } },
  });
  if (!existing || existing.subOrderId !== subOrderId) notFound();
  if (existing.transfersFrom.length > 0) {
    badRequest("This truck already transferred cargo and cannot be changed");
  }
  if (!existing.canceledAt) {
    await prisma.truck.update({
      where: { id },
      data: { canceledAt: new Date() },
    });
  }
  await prisma.driverAssignment.updateMany({
    where: { truckId: id, status: { in: ["PENDING", "ACTIVE"] } },
    data: { status: "REVOKED", pairingCodeHash: null, pairingExpiresAt: null },
  });
}

// Admin-only, unlike cancelGroupOrder — this permanently removes the order
// and everything under it (sub-orders, trucks, transfers, assignments,
// comments) via cascade, and cannot be undone. DB rows cascade on their own,
// but Supabase Storage objects don't, so truck media is cleaned up first.
export async function deleteGroupOrder(id: string) {
  const order = await prisma.groupOrder.findUnique({
    where: { id },
    include: { subOrders: { include: { trucks: { include: { media: true } } } } },
  });
  if (!order) notFound();

  const fileUrls = order.subOrders.flatMap((sub) =>
    sub.trucks.flatMap((truck) => truck.media.map((item) => item.url))
  );
  await removePublicFiles(fileUrls);
  await prisma.groupOrder.delete({ where: { id } });
}

/** Same as deleteGroupOrder, for a single sub-order — cannot be undone. */
export async function deleteSubOrder(id: string, groupOrderId: string) {
  const sub = await prisma.subOrder.findUnique({
    where: { id },
    include: { trucks: { include: { media: true } } },
  });
  if (!sub || sub.groupOrderId !== groupOrderId) notFound();

  const fileUrls = sub.trucks.flatMap((truck) => truck.media.map((item) => item.url));
  await removePublicFiles(fileUrls);
  await prisma.subOrder.delete({ where: { id } });
}

export async function completeSubOrder(id: string, groupOrderId: string) {
  await assertGroupOrderActive(groupOrderId);
  const existing = await prisma.subOrder.findUnique({ where: { id } });
  if (!existing || existing.groupOrderId !== groupOrderId) notFound();
  if (existing.status === "CANCELED") badRequest("This sub-order is canceled");
  if (existing.status === "CLOSED") return existing;
  return prisma.subOrder.update({
    where: { id },
    data: {
      status: "CLOSED",
      arrivedAt: existing.arrivedAt ?? new Date(),
    },
  });
}

