import { prisma } from "./prisma.js";
import { badRequest, notFound } from "./errors.js";

export async function assertGroupOrderActive(orderId: string) {
  const order = await prisma.groupOrder.findUnique({ where: { id: orderId } });
  if (!order) notFound();
  if (order.canceledAt) badRequest("This order is canceled");
  return order;
}

export async function assertSubOrderNotCanceled(subOrderId: string) {
  const sub = await prisma.subOrder.findUnique({ where: { id: subOrderId } });
  if (!sub) notFound("Sub-order not found");
  if (sub.status === "CANCELED") badRequest("This sub-order is canceled");
  return sub;
}

export async function countActiveTrucks(subOrderId: string) {
  return prisma.truck.count({ where: { subOrderId, canceledAt: null } });
}

export async function assertCanAddDirectTruck(subOrderId: string) {
  await assertSubOrderNotCanceled(subOrderId);
  const active = await countActiveTrucks(subOrderId);
  if (active > 0) {
    badRequest("This sub-order already has a truck. Record a cargo transfer to add another truck.");
  }
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
  const existing = await prisma.truck.findUnique({ where: { id } });
  if (!existing || existing.subOrderId !== subOrderId) notFound();
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

export function subOrderPatchStatus(
  existingStatus: "OPEN" | "CLOSED" | "CANCELED",
  arrivedAt: Date | null
): "OPEN" | "CLOSED" | "CANCELED" {
  if (existingStatus === "CANCELED") return "CANCELED";
  return arrivedAt ? "CLOSED" : "OPEN";
}
