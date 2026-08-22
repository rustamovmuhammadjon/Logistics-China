import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { conflict, notFound, unauthorized } from "../lib/errors.js";
import { optionalDate, optionalString, requiredString } from "../lib/input.js";
import { detailInclude, findActivePlateConflict, plateConflictMessage, truckFields } from "../lib/orders.js";
import { asyncHandler } from "../middleware/errors.js";
import { assertOperatorLinked, requireOperator, type AuthedRequest } from "../middleware/auth.js";

export const operatorRouter = Router();

operatorRouter.use(requireOperator);

async function loadLinkedOrder(operatorId: string, orderId: string) {
  const order = await prisma.groupOrder.findUnique({ where: { id: orderId } });
  if (!order) notFound();
  await assertOperatorLinked(operatorId, order.ownerId);
  return order;
}

operatorRouter.get(
  "/orders/:id",
  asyncHandler(async (req, res) => {
    const me = (req as AuthedRequest).user!;
    await loadLinkedOrder(me.id, req.params.id);
    const order = await prisma.groupOrder.findUnique({
      where: { id: req.params.id },
      include: detailInclude,
    });
    if (!order) notFound();
    res.json({ order });
  })
);

operatorRouter.patch(
  "/orders/:id/location",
  asyncHandler(async (req, res) => {
    const me = (req as AuthedRequest).user!;
    const order = await loadLinkedOrder(me.id, req.params.id);
    const statusText = optionalString(req.body?.statusText);
    const changed = statusText !== order.statusText;
    const updated = await prisma.groupOrder.update({
      where: { id: order.id },
      data: { statusText, statusUpdatedAt: changed ? new Date() : order.statusUpdatedAt },
    });
    res.json({ order: updated });
  })
);

operatorRouter.patch(
  "/orders/:id/sub-orders/:subId/location",
  asyncHandler(async (req, res) => {
    const me = (req as AuthedRequest).user!;
    await loadLinkedOrder(me.id, req.params.id);
    const sub = await prisma.subOrder.findUnique({ where: { id: req.params.subId } });
    if (!sub || sub.groupOrderId !== req.params.id) unauthorized();
    const statusText = optionalString(req.body?.statusText);
    const changed = statusText !== sub.statusText;
    const updated = await prisma.subOrder.update({
      where: { id: sub.id },
      data: { statusText, statusUpdatedAt: changed ? new Date() : sub.statusUpdatedAt },
    });
    res.json({ subOrder: updated });
  })
);

operatorRouter.patch(
  "/orders/:id/trucks/:truckId/location",
  asyncHandler(async (req, res) => {
    const me = (req as AuthedRequest).user!;
    await loadLinkedOrder(me.id, req.params.id);
    const truck = await prisma.truck.findUnique({
      where: { id: req.params.truckId },
      include: { subOrder: true },
    });
    if (!truck || truck.subOrder.groupOrderId !== req.params.id) unauthorized();
    const currentLocation = optionalString(req.body?.currentLocation);
    const changed = currentLocation !== truck.currentLocation;
    const updated = await prisma.truck.update({
      where: { id: truck.id },
      data: {
        currentLocation,
        locationUpdatedAt: changed ? new Date() : truck.locationUpdatedAt,
      },
    });
    res.json({ truck: updated });
  })
);

operatorRouter.post(
  "/comments",
  asyncHandler(async (req, res) => {
    const me = (req as AuthedRequest).user!;
    const groupOrderId = requiredString(req.body?.groupOrderId, "groupOrderId");
    const level = requiredString(req.body?.level, "level");
    await loadLinkedOrder(me.id, groupOrderId);
    const text = requiredString(req.body?.text, "text");

    const comment = await prisma.comment.create({
      data: {
        text,
        author: me.email,
        groupOrderId: level === "group" ? groupOrderId : undefined,
        subOrderId: level === "sub" ? optionalString(req.body?.subOrderId) : undefined,
        truckId: level === "truck" ? optionalString(req.body?.truckId) : undefined,
      },
    });
    res.json({ comment });
  })
);

async function requireLinkedSubOrder(operatorId: string, orderId: string, subId: string) {
  await loadLinkedOrder(operatorId, orderId);
  const sub = await prisma.subOrder.findUnique({ where: { id: subId } });
  if (!sub || sub.groupOrderId !== orderId) notFound();
  return sub;
}

operatorRouter.post(
  "/orders/:id/sub-orders",
  asyncHandler(async (req, res) => {
    const me = (req as AuthedRequest).user!;
    await loadLinkedOrder(me.id, req.params.id);
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

operatorRouter.post(
  "/orders/:id/sub-orders/:subId/trucks",
  asyncHandler(async (req, res) => {
    const me = (req as AuthedRequest).user!;
    await requireLinkedSubOrder(me.id, req.params.id, req.params.subId);
    const data = truckFields(req.body);
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

operatorRouter.patch(
  "/orders/:id/sub-orders/:subId/trucks/:truckId",
  asyncHandler(async (req, res) => {
    const me = (req as AuthedRequest).user!;
    await requireLinkedSubOrder(me.id, req.params.id, req.params.subId);
    const existing = await prisma.truck.findUnique({ where: { id: req.params.truckId } });
    if (!existing || existing.subOrderId !== req.params.subId) notFound();
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

operatorRouter.delete(
  "/orders/:id/sub-orders/:subId/trucks/:truckId",
  asyncHandler(async (req, res) => {
    const me = (req as AuthedRequest).user!;
    await requireLinkedSubOrder(me.id, req.params.id, req.params.subId);
    const existing = await prisma.truck.findUnique({ where: { id: req.params.truckId } });
    if (!existing || existing.subOrderId !== req.params.subId) notFound();
    await prisma.truck.delete({ where: { id: existing.id } });
    res.json({ ok: true });
  })
);
