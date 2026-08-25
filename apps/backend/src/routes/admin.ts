import { Router } from "express";
import type { PaymentStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { badRequest, conflict, notFound } from "../lib/errors.js";
import { optionalDate, optionalString, requiredString } from "../lib/input.js";
import { assertSupabasePublicUrl, getSupabaseAdmin, storageBucket } from "../lib/supabase.js";
import { findActivePlateConflict, listIncludeWithPeople, plateConflictMessage, truckFields, withOrderPeople } from "../lib/orders.js";
import { createDriverAssignment, regenerateDriverAssignment, revokeDriverAssignment } from "../lib/assignments.js";
import { createCargoTransfer } from "../lib/transfers.js";
import { assertCanAddDirectTruck, assertGroupOrderActive, assertTruckNotFrozen, cancelGroupOrder, cancelSubOrder, cancelTruck, completeSubOrder } from "../lib/lifecycle.js";
import { deleteUserAndRelatedData } from "../lib/users.js";
import { toPublicUser } from "../lib/auth.js";
import { asyncHandler } from "../middleware/errors.js";
import { requireAdmin } from "../middleware/auth.js";

export const adminRouter = Router();

adminRouter.use(requireAdmin);

adminRouter.get(
  "/users",
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }, { email: "asc" }],
      include: { _count: { select: { ownedOrders: true } } },
    });
    res.json({
      registrationCode: process.env.REGISTRATION_CODE ?? "",
      users: users.map((user) => ({
        ...toPublicUser(user),
        createdAt: user.createdAt.toISOString(),
        ownedOrderCount: user._count.ownedOrders,
      })),
    });
  })
);

adminRouter.delete(
  "/users/:id",
  asyncHandler(async (req, res) => {
    await deleteUserAndRelatedData(req.params.id);
    res.json({ ok: true });
  })
);

adminRouter.get(
  "/orders",
  asyncHandler(async (_req, res) => {
    const orders = await prisma.groupOrder.findMany({
      include: listIncludeWithPeople,
      orderBy: { createdAt: "desc" },
    });
    res.json({ orders: orders.map(withOrderPeople) });
  })
);

function orderData(body: Record<string, unknown>) {
  return {
    name: requiredString(body.name, "name"),
    openedAt: optionalDate(body.openedAt),
    pol: optionalString(body.pol),
    origin: optionalString(body.origin),
    destination: optionalString(body.destination),
    commodity: optionalString(body.commodity),
    volumeInfo: optionalString(body.volumeInfo),
  };
}

adminRouter.post(
  "/orders",
  asyncHandler(async (req, res) => {
    const data = orderData(req.body);
    const order = await prisma.groupOrder.create({
      data,
    });
    res.json({ order });
  })
);

adminRouter.get(
  "/orders/:id",
  asyncHandler(async (req, res) => {
    const order = await prisma.groupOrder.findUnique({
      where: { id: req.params.id },
      include: {
        subOrders: { orderBy: { createdAt: "asc" }, include: { trucks: true } },
      },
    });
    if (!order) notFound();
    res.json({ order });
  })
);

adminRouter.patch(
  "/orders/:id",
  asyncHandler(async (req, res) => {
    const existing = await prisma.groupOrder.findUnique({ where: { id: req.params.id } });
    if (!existing) notFound();
    const data = orderData(req.body);
    const order = await prisma.groupOrder.update({
      where: { id: existing.id },
      data,
    });
    res.json({ order });
  })
);

adminRouter.post(
  "/orders/:id/cancel",
  asyncHandler(async (req, res) => {
    await cancelGroupOrder(req.params.id);
    res.json({ ok: true });
  })
);

adminRouter.delete(
  "/orders/:id",
  asyncHandler(async (req, res) => {
    await cancelGroupOrder(req.params.id);
    res.json({ ok: true });
  })
);

adminRouter.post(
  "/orders/:id/sub-orders",
  asyncHandler(async (req, res) => {
    await assertGroupOrderActive(req.params.id);
    const subOrder = await prisma.subOrder.create({
      data: {
        groupOrderId: req.params.id,
        name: optionalString(req.body?.name),
        openedAt: optionalDate(req.body?.openedAt),
        status: "OPEN",
      },
    });
    res.json({ subOrder });
  })
);

adminRouter.get(
  "/orders/:id/sub-orders/:subId",
  asyncHandler(async (req, res) => {
    const sub = await prisma.subOrder.findUnique({
      where: { id: req.params.subId },
      include: {
        groupOrder: true,
        comments: { orderBy: { createdAt: "desc" } },
        trucks: {
          orderBy: { createdAt: "asc" },
          include: {
            transfersFrom: { include: { toTruck: { select: { id: true, plateNumber: true, trailerPlateNumber: true } } } },
            transfersTo: { include: { fromTruck: { select: { id: true, plateNumber: true, trailerPlateNumber: true } } } },
            assignments: {
              where: { status: { in: ["PENDING", "ACTIVE"] as Array<"PENDING" | "ACTIVE"> } },
              orderBy: { createdAt: "desc" },
              select: {
                id: true,
                truckId: true,
                phoneNormalized: true,
                status: true,
                claimedAt: true,
                lastLat: true,
                lastLng: true,
                lastLocationText: true,
                lastPingAt: true,
                pairingExpiresAt: true,
                createdAt: true,
                createdByLabel: true,
              },
            },
          },
        },
      },
    });
    if (!sub || sub.groupOrderId !== req.params.id) notFound();
    res.json({ subOrder: sub });
  })
);

adminRouter.patch(
  "/orders/:id/sub-orders/:subId",
  asyncHandler(async (req, res) => {
    const existing = await prisma.subOrder.findUnique({ where: { id: req.params.subId } });
    if (!existing || existing.groupOrderId !== req.params.id) notFound();
    const subOrder = await prisma.subOrder.update({
      where: { id: existing.id },
      data: {
        name: optionalString(req.body?.name),
        openedAt: optionalDate(req.body?.openedAt),
      },
    });
    res.json({ subOrder });
  })
);

adminRouter.post(
  "/orders/:id/sub-orders/:subId/complete",
  asyncHandler(async (req, res) => {
    await completeSubOrder(req.params.subId, req.params.id);
    res.json({ ok: true });
  })
);

adminRouter.post(
  "/orders/:id/sub-orders/:subId/cancel",
  asyncHandler(async (req, res) => {
    await cancelSubOrder(req.params.subId, req.params.id);
    res.json({ ok: true });
  })
);

adminRouter.delete(
  "/orders/:id/sub-orders/:subId",
  asyncHandler(async (req, res) => {
    await cancelSubOrder(req.params.subId, req.params.id);
    res.json({ ok: true });
  })
);

adminRouter.post(
  "/orders/:id/sub-orders/:subId/trucks",
  asyncHandler(async (req, res) => {
    const data = truckFields(req.body);
    await assertCanAddDirectTruck(req.params.subId);
    const clash = await findActivePlateConflict({
      plateNumber: data.plateNumber,
      trailerPlateNumber: data.trailerPlateNumber,
      subOrderId: req.params.subId,
    });
    if (clash) conflict(plateConflictMessage(clash));
    const truck = await prisma.truck.create({
      data: {
        subOrderId: req.params.subId,
        ...data,
        locationUpdatedAt: data.currentLocation ? new Date() : null,
      },
    });
    res.json({ truck });
  })
);

adminRouter.get(
  "/orders/:id/sub-orders/:subId/trucks/:truckId",
  asyncHandler(async (req, res) => {
    const truck = await prisma.truck.findUnique({
      where: { id: req.params.truckId },
      include: {
        subOrder: { include: { groupOrder: true } },
        media: { orderBy: { createdAt: "desc" } },
        transfersFrom: { include: { toTruck: { select: { id: true, plateNumber: true } } } },
        transfersTo: { include: { fromTruck: { select: { id: true, plateNumber: true } } } },
      },
    });
    if (
      !truck ||
      truck.subOrderId !== req.params.subId ||
      truck.subOrder.groupOrderId !== req.params.id
    ) {
      notFound();
    }
    res.json({ truck });
  })
);

adminRouter.patch(
  "/orders/:id/sub-orders/:subId/trucks/:truckId",
  asyncHandler(async (req, res) => {
    const existing = await assertTruckNotFrozen(req.params.truckId, req.params.subId);
    const data = truckFields(req.body);
    const clash = await findActivePlateConflict({
      plateNumber: data.plateNumber,
      trailerPlateNumber: data.trailerPlateNumber,
      subOrderId: req.params.subId,
      excludeTruckId: existing.id,
    });
    if (clash) conflict(plateConflictMessage(clash));
    const locationChanged = data.currentLocation !== existing.currentLocation;
    const truck = await prisma.truck.update({
      where: { id: existing.id },
      data: {
        ...data,
        locationUpdatedAt: locationChanged ? new Date() : existing.locationUpdatedAt,
      },
    });
    res.json({ truck });
  })
);

adminRouter.post(
  "/orders/:id/sub-orders/:subId/trucks/:truckId/cancel",
  asyncHandler(async (req, res) => {
    await cancelTruck(req.params.truckId, req.params.subId);
    res.json({ ok: true });
  })
);

adminRouter.delete(
  "/orders/:id/sub-orders/:subId/trucks/:truckId",
  asyncHandler(async (req, res) => {
    await cancelTruck(req.params.truckId, req.params.subId);
    res.json({ ok: true });
  })
);

adminRouter.patch(
  "/orders/:id/sub-orders/:subId/trucks/:truckId/payment",
  asyncHandler(async (req, res) => {
    const field = req.body?.field as "driverPaymentStatus" | "customerPaymentStatus";
    const value = req.body?.value as PaymentStatus;
    if (
      (field !== "driverPaymentStatus" && field !== "customerPaymentStatus") ||
      (value !== "PAID" && value !== "NOT_PAID")
    ) {
      throw new Error("Invalid payment update");
    }
    const truck = await prisma.truck.update({
      where: { id: req.params.truckId },
      data: { [field]: value },
    });
    res.json({ truck });
  })
);

adminRouter.post(
  "/orders/:id/sub-orders/:subId/assignments",
  asyncHandler(async (req, res) => {
    const result = await createDriverAssignment({
      subOrderId: req.params.subId,
      plateNumber: req.body?.plateNumber,
      phone: req.body?.phone ?? req.body?.driverPhone,
      createdByUserId: null,
      createdByLabel: "admin",
    });
    res.json(result);
  })
);

adminRouter.post(
  "/orders/:id/sub-orders/:subId/assignments/:assignmentId/regenerate",
  asyncHandler(async (req, res) => {
    const result = await regenerateDriverAssignment(req.params.assignmentId, req.params.subId);
    res.json(result);
  })
);

adminRouter.delete(
  "/orders/:id/sub-orders/:subId/assignments/:assignmentId",
  asyncHandler(async (req, res) => {
    await revokeDriverAssignment(req.params.assignmentId, req.params.subId);
    res.json({ ok: true });
  })
);

adminRouter.post(
  "/orders/:id/sub-orders/:subId/transfers",
  asyncHandler(async (req, res) => {
    const transfer = await createCargoTransfer({
      subOrderId: req.params.subId,
      body: req.body as Record<string, unknown>,
    });
    res.json({ transfer });
  })
);

adminRouter.delete(
  "/orders/:id/sub-orders/:subId/transfers/:transferId",
  asyncHandler(async (req, res) => {
    await prisma.cargoTransfer.delete({ where: { id: req.params.transferId } });
    res.json({ ok: true });
  })
);

adminRouter.post(
  "/comments",
  asyncHandler(async (req, res) => {
    const level = requiredString(req.body?.level, "level");
    if (level !== "sub") badRequest("Comments are only allowed on sub-orders");
    const comment = await prisma.comment.create({
      data: {
        text: requiredString(req.body?.text, "text"),
        author: optionalString(req.body?.author),
        subOrderId: requiredString(req.body?.subOrderId, "subOrderId"),
      },
    });
    res.json({ comment });
  })
);

adminRouter.delete(
  "/comments/:id",
  asyncHandler(async (req, res) => {
    await prisma.comment.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  })
);

adminRouter.post(
  "/media",
  asyncHandler(async (req, res) => {
    const truckId = requiredString(req.body?.truckId, "truckId");
    await assertTruckNotFrozen(truckId);
    const url = requiredString(req.body?.url, "url");
    assertSupabasePublicUrl(url);
    const type = req.body?.type === "VIDEO" ? "VIDEO" : "IMAGE";
    const media = await prisma.media.create({
      data: {
        truckId,
        url,
        type,
        fileName: optionalString(req.body?.fileName),
      },
    });
    res.json({ media });
  })
);

adminRouter.delete(
  "/media/:id",
  asyncHandler(async (req, res) => {
    const media = await prisma.media.findUnique({ where: { id: req.params.id } });
    if (!media) notFound();
    await prisma.media.delete({ where: { id: media.id } });
    try {
      const marker = `/storage/v1/object/public/${storageBucket()}/`;
      const idx = media.url.indexOf(marker);
      if (idx !== -1) {
        const path = decodeURIComponent(media.url.slice(idx + marker.length));
        await getSupabaseAdmin().storage.from(storageBucket()).remove([path]);
      }
    } catch {
      // ignore storage cleanup errors
    }
    res.json({ ok: true });
  })
);
