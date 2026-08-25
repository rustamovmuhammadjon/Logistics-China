import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { badRequest, conflict, notFound, unauthorized } from "../lib/errors.js";
import { optionalString, requiredString } from "../lib/input.js";
import { detailInclude, findActivePlateConflict, plateConflictMessage, truckFields } from "../lib/orders.js";
import { createDriverAssignment, regenerateDriverAssignment, revokeDriverAssignment } from "../lib/assignments.js";
import { createCargoTransfer } from "../lib/transfers.js";
import { assertCanAddDirectTruck, cancelSubOrder, cancelTruck } from "../lib/lifecycle.js";
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
    if (level !== "sub") badRequest("Comments are only allowed on sub-orders");
    const subOrderId = requiredString(req.body?.subOrderId, "subOrderId");
    await requireLinkedSubOrder(me.id, groupOrderId, subOrderId);
    const comment = await prisma.comment.create({
      data: {
        text: requiredString(req.body?.text, "text"),
        author: me.email,
        subOrderId,
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
  "/orders/:id/sub-orders/:subId/trucks",
  asyncHandler(async (req, res) => {
    const me = (req as AuthedRequest).user!;
    await requireLinkedSubOrder(me.id, req.params.id, req.params.subId);
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

operatorRouter.post(
  "/orders/:id/sub-orders/:subId/cancel",
  asyncHandler(async (req, res) => {
    const me = (req as AuthedRequest).user!;
    await requireLinkedSubOrder(me.id, req.params.id, req.params.subId);
    await cancelSubOrder(req.params.subId, req.params.id);
    res.json({ ok: true });
  })
);

operatorRouter.post(
  "/orders/:id/sub-orders/:subId/trucks/:truckId/cancel",
  asyncHandler(async (req, res) => {
    const me = (req as AuthedRequest).user!;
    await requireLinkedSubOrder(me.id, req.params.id, req.params.subId);
    const existing = await prisma.truck.findUnique({ where: { id: req.params.truckId } });
    if (!existing || existing.subOrderId !== req.params.subId) notFound();
    await cancelTruck(existing.id, existing.subOrderId);
    res.json({ ok: true });
  })
);

operatorRouter.delete(
  "/orders/:id/sub-orders/:subId/trucks/:truckId",
  asyncHandler(async (req, res) => {
    const me = (req as AuthedRequest).user!;
    await requireLinkedSubOrder(me.id, req.params.id, req.params.subId);
    const existing = await prisma.truck.findUnique({ where: { id: req.params.truckId } });
    if (!existing || existing.subOrderId !== req.params.subId) notFound();
    await cancelTruck(existing.id, existing.subOrderId);
    res.json({ ok: true });
  })
);

operatorRouter.post(
  "/orders/:id/sub-orders/:subId/assignments",
  asyncHandler(async (req, res) => {
    const me = (req as AuthedRequest).user!;
    await requireLinkedSubOrder(me.id, req.params.id, req.params.subId);
    const result = await createDriverAssignment({
      subOrderId: req.params.subId,
      plateNumber: req.body?.plateNumber,
      phone: req.body?.phone ?? req.body?.driverPhone,
      createdByUserId: me.id,
      createdByLabel: me.email,
    });
    res.json(result);
  })
);

operatorRouter.post(
  "/orders/:id/sub-orders/:subId/assignments/:assignmentId/regenerate",
  asyncHandler(async (req, res) => {
    const me = (req as AuthedRequest).user!;
    await requireLinkedSubOrder(me.id, req.params.id, req.params.subId);
    const result = await regenerateDriverAssignment(req.params.assignmentId, req.params.subId);
    res.json(result);
  })
);

operatorRouter.delete(
  "/orders/:id/sub-orders/:subId/assignments/:assignmentId",
  asyncHandler(async (req, res) => {
    const me = (req as AuthedRequest).user!;
    await requireLinkedSubOrder(me.id, req.params.id, req.params.subId);
    await revokeDriverAssignment(req.params.assignmentId, req.params.subId);
    res.json({ ok: true });
  })
);

operatorRouter.post(
  "/orders/:id/sub-orders/:subId/transfers",
  asyncHandler(async (req, res) => {
    const me = (req as AuthedRequest).user!;
    await requireLinkedSubOrder(me.id, req.params.id, req.params.subId);
    const transfer = await createCargoTransfer({
      subOrderId: req.params.subId,
      body: req.body as Record<string, unknown>,
    });
    res.json({ transfer });
  })
);
