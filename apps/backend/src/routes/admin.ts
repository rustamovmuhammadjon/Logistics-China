import { Router } from "express";
import type { PaymentStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { conflict, notFound } from "../lib/errors.js";
import { optionalDate, optionalFloat, optionalString, requiredString } from "../lib/input.js";
import { assertSupabasePublicUrl, getSupabaseAdmin, storageBucket } from "../lib/supabase.js";
import { findActivePlateConflict, listInclude, plateConflictMessage } from "../lib/orders.js";
import { toPublicUser } from "../lib/auth.js";
import { asyncHandler } from "../middleware/errors.js";
import { requireAdmin } from "../middleware/auth.js";

export const adminRouter = Router();

adminRouter.use(requireAdmin);

const personSelect = {
  id: true,
  email: true,
  role: true,
  firstName: true,
  lastName: true,
  phone: true,
  photoUrl: true,
  linkCode: true,
  dateOfBirth: true,
} as const;

function toPerson(user: {
  id: string;
  email: string;
  role: "CONSIGNEE" | "OPERATOR";
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  photoUrl: string | null;
  linkCode: string;
  dateOfBirth: Date | null;
}) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    photoUrl: user.photoUrl,
    linkCode: user.linkCode,
    dateOfBirth: user.dateOfBirth ? user.dateOfBirth.toISOString() : null,
  };
}

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

adminRouter.get(
  "/orders",
  asyncHandler(async (_req, res) => {
    const orders = await prisma.groupOrder.findMany({
      include: {
        ...listInclude,
        owner: {
          select: {
            ...personSelect,
            linksAsConsignee: { select: { operator: { select: personSelect } } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({
      orders: orders.map(({ owner, ...order }) => ({
        ...order,
        owner: owner ? toPerson(owner) : null,
        operators: owner?.linksAsConsignee.map((link) => toPerson(link.operator)) ?? [],
      })),
    });
  })
);

function orderData(body: Record<string, unknown>) {
  const statusText = optionalString(body.statusText);
  return {
    name: requiredString(body.name, "name"),
    openedAt: optionalDate(body.openedAt),
    arrivedAt: optionalDate(body.arrivedAt),
    pol: optionalString(body.pol),
    origin: optionalString(body.origin),
    destination: optionalString(body.destination),
    commodity: optionalString(body.commodity),
    volumeInfo: optionalString(body.volumeInfo),
    factoryLoadDate: optionalDate(body.factoryLoadDate),
    statusText,
  };
}

adminRouter.post(
  "/orders",
  asyncHandler(async (req, res) => {
    const data = orderData(req.body);
    const order = await prisma.groupOrder.create({
      data: {
        ...data,
        statusUpdatedAt: data.statusText ? new Date() : null,
      },
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
        comments: { orderBy: { createdAt: "desc" } },
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
    const statusChanged = data.statusText !== existing.statusText;
    const order = await prisma.groupOrder.update({
      where: { id: existing.id },
      data: {
        ...data,
        statusUpdatedAt: statusChanged ? new Date() : existing.statusUpdatedAt,
      },
    });
    res.json({ order });
  })
);

adminRouter.delete(
  "/orders/:id",
  asyncHandler(async (req, res) => {
    await prisma.groupOrder.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  })
);

adminRouter.post(
  "/orders/:id/sub-orders",
  asyncHandler(async (req, res) => {
    const arrivedAt = optionalDate(req.body?.arrivedAt);
    const subOrder = await prisma.subOrder.create({
      data: {
        groupOrderId: req.params.id,
        name: optionalString(req.body?.name),
        openedAt: optionalDate(req.body?.openedAt),
        arrivedAt,
        status: arrivedAt ? "CLOSED" : "OPEN",
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
            transfersFrom: { include: { toTruck: { select: { id: true, plateNumber: true } } } },
            transfersTo: { include: { fromTruck: { select: { id: true, plateNumber: true } } } },
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
    const arrivedAt = optionalDate(req.body?.arrivedAt);
    const statusText = optionalString(req.body?.statusText);
    const statusChanged = statusText !== existing.statusText;
    const subOrder = await prisma.subOrder.update({
      where: { id: existing.id },
      data: {
        name: optionalString(req.body?.name),
        openedAt: optionalDate(req.body?.openedAt),
        arrivedAt,
        status: arrivedAt ? "CLOSED" : "OPEN",
        statusText,
        statusUpdatedAt: statusChanged ? new Date() : existing.statusUpdatedAt,
      },
    });
    res.json({ subOrder });
  })
);

adminRouter.delete(
  "/orders/:id/sub-orders/:subId",
  asyncHandler(async (req, res) => {
    await prisma.subOrder.delete({ where: { id: req.params.subId } });
    res.json({ ok: true });
  })
);

function truckData(body: Record<string, unknown>) {
  return {
    plateNumber: optionalString(body.plateNumber),
    trailerPlateNumber: optionalString(body.trailerPlateNumber),
    driverName: optionalString(body.driverName),
    driverPhone: optionalString(body.driverPhone),
    lengthM: optionalFloat(body.lengthM),
    widthM: optionalFloat(body.widthM),
    heightM: optionalFloat(body.heightM),
    cargoWeight: optionalFloat(body.cargoWeight),
    cargoDescription: optionalString(body.cargoDescription),
    currentLocation: optionalString(body.currentLocation),
  };
}

adminRouter.post(
  "/orders/:id/sub-orders/:subId/trucks",
  asyncHandler(async (req, res) => {
    const data = truckData(req.body);
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
        comments: { orderBy: { createdAt: "desc" } },
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
    const existing = await prisma.truck.findUnique({ where: { id: req.params.truckId } });
    if (!existing || existing.subOrderId !== req.params.subId) notFound();
    const data = truckData(req.body);
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

adminRouter.delete(
  "/orders/:id/sub-orders/:subId/trucks/:truckId",
  asyncHandler(async (req, res) => {
    await prisma.truck.delete({ where: { id: req.params.truckId } });
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
  "/orders/:id/sub-orders/:subId/transfers",
  asyncHandler(async (req, res) => {
    const fromTruckId = requiredString(req.body?.fromTruckId, "fromTruckId");
    const toTruckId = requiredString(req.body?.toTruckId, "toTruckId");
    if (fromTruckId === toTruckId) {
      res.json({ ok: true, skipped: true });
      return;
    }
    const transfer = await prisma.cargoTransfer.create({
      data: {
        fromTruckId,
        toTruckId,
        transferDate: optionalDate(req.body?.transferDate),
        comment: optionalString(req.body?.comment),
      },
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
    const comment = await prisma.comment.create({
      data: {
        text: requiredString(req.body?.text, "text"),
        author: optionalString(req.body?.author),
        groupOrderId: level === "group" ? requiredString(req.body?.groupOrderId, "groupOrderId") : undefined,
        subOrderId: level === "sub" ? requiredString(req.body?.subOrderId, "subOrderId") : undefined,
        truckId: level === "truck" ? requiredString(req.body?.truckId, "truckId") : undefined,
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
    const url = requiredString(req.body?.url, "url");
    assertSupabasePublicUrl(url);
    const type = req.body?.type === "VIDEO" ? "VIDEO" : "IMAGE";
    const media = await prisma.media.create({
      data: {
        truckId: requiredString(req.body?.truckId, "truckId"),
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
