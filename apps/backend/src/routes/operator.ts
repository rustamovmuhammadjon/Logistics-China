import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { badRequest, conflict, notFound, unauthorized } from "../lib/errors.js";
import { optionalDate, optionalString, requiredString } from "../lib/input.js";
import {
  detailInclude,
  findActivePlateConflict,
  plateConflictMessage,
  touchSubOrderEditor,
  truckFields,
} from "../lib/orders.js";
import { createDriverAssignment, regenerateDriverAssignment, revokeDriverAssignment } from "../lib/assignments.js";
import { createCargoTransfer } from "../lib/transfers.js";
import { assertCanAddDirectTruck, assertSubOrderMutable, assertTruckMutable, cancelSubOrder, cancelTruck } from "../lib/lifecycle.js";
import { asyncHandler } from "../middleware/errors.js";
import { assertOperatorLinked, requireOperator, type AuthedRequest } from "../middleware/auth.js";
import { broadcastOnMutation } from "../middleware/realtime.js";

export const operatorRouter = Router();

operatorRouter.use(requireOperator);
operatorRouter.use(broadcastOnMutation);

async function loadLinkedOrder(operatorId: string, orderId: string) {
  const order = await prisma.groupOrder.findUnique({ where: { id: orderId } });
  if (!order) notFound();
  await assertOperatorLinked(operatorId, order, orderId);
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
  "/orders/:id",
  asyncHandler(async (req, res) => {
    const me = (req as AuthedRequest).user!;
    const existing = await loadLinkedOrder(me.id, req.params.id);
    const order = await prisma.groupOrder.update({
      where: { id: existing.id },
      data: { pol: optionalString(req.body?.pol), lastEditedByEmail: me.email, lastEditedAt: new Date() },
    });
    res.json({ order });
  })
);

operatorRouter.patch(
  "/orders/:id/sub-orders/:subId",
  asyncHandler(async (req, res) => {
    const me = (req as AuthedRequest).user!;
    const sub = await requireLinkedSubOrder(me.id, req.params.id, req.params.subId);
    // The factory load date can be corrected at any time, even after the
    // sub-order is completed or cancelled — unlike other sub-order fields
    // it isn't frozen by status.
    const updated = await prisma.subOrder.update({
      where: { id: sub.id },
      data: {
        factoryLoadDate: optionalDate(req.body?.factoryLoadDate),
        lastEditedByEmail: me.email,
        lastEditedAt: new Date(),
      },
    });
    res.json({ subOrder: updated });
  })
);

operatorRouter.patch(
  "/orders/:id/trucks/:truckId/location",
  asyncHandler(async (req, res) => {
    const me = (req as AuthedRequest).user!;
    await loadLinkedOrder(me.id, req.params.id);
    const truck = await assertTruckMutable(req.params.truckId);
    if (truck.subOrder.groupOrderId !== req.params.id) unauthorized();
    const currentLocation = optionalString(req.body?.currentLocation);
    const changed = currentLocation !== truck.currentLocation;
    const [updated] = await Promise.all([
      prisma.truck.update({
        where: { id: truck.id },
        data: {
          currentLocation,
          locationUpdatedAt: changed ? new Date() : truck.locationUpdatedAt,
        },
      }),
      touchSubOrderEditor(truck.subOrderId, me.email),
    ]);
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
    await assertSubOrderMutable(subOrderId);
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
    const [truck] = await Promise.all([
      prisma.truck.create({
        data: {
          subOrderId: req.params.subId,
          ...data,
          // GPS number is operator-only and lives outside truckFields() on
          // purpose — admin's own truck routes call truckFields() too, and
          // must not gain the ability to set it just by sharing that helper.
          gpsNumber: optionalString(req.body?.gpsNumber),
          locationUpdatedAt: data.currentLocation ? new Date() : null,
        },
      }),
      touchSubOrderEditor(req.params.subId, me.email),
    ]);
    res.json({ truck });
  })
);

operatorRouter.patch(
  "/orders/:id/sub-orders/:subId/trucks/:truckId",
  asyncHandler(async (req, res) => {
    const me = (req as AuthedRequest).user!;
    await requireLinkedSubOrder(me.id, req.params.id, req.params.subId);
    const existing = await assertTruckMutable(req.params.truckId, req.params.subId);
    const data = truckFields(req.body);
    const clash = await findActivePlateConflict({
      plateNumber: data.plateNumber,
      trailerPlateNumber: data.trailerPlateNumber,
      subOrderId: req.params.subId,
      excludeTruckId: existing.id,
    });
    if (clash) conflict(plateConflictMessage(clash));
    const locationChanged = data.currentLocation !== existing.currentLocation;
    const [truck] = await Promise.all([
      prisma.truck.update({
        where: { id: existing.id },
        data: {
          ...data,
          gpsNumber: optionalString(req.body?.gpsNumber),
          locationUpdatedAt: locationChanged ? new Date() : existing.locationUpdatedAt,
        },
      }),
      touchSubOrderEditor(req.params.subId, me.email),
    ]);
    res.json({ truck });
  })
);

// track718 (Starlink Box) — Phase 1: just save the number. Saving always
// resets status to PENDING and clears any old error, since a changed number
// (or a re-save) means whatever happened before is no longer relevant; a
// later phase moves it to ACTIVE once the first webhook push arrives.
operatorRouter.patch(
  "/orders/:id/sub-orders/:subId/trucks/:truckId/track718",
  asyncHandler(async (req, res) => {
    const me = (req as AuthedRequest).user!;
    await requireLinkedSubOrder(me.id, req.params.id, req.params.subId);
    const truck = await assertTruckMutable(req.params.truckId, req.params.subId);
    const trackingNumber = requiredString(req.body?.trackingNumber, "trackingNumber");
    const trackFrom = optionalDate(req.body?.trackFrom) ?? new Date();

    const track718 = await prisma.track718Tracking.upsert({
      where: { truckId: truck.id },
      create: { truckId: truck.id, trackingNumber, trackFrom },
      update: { trackingNumber, trackFrom, status: "PENDING", error: null },
    });
    await touchSubOrderEditor(req.params.subId, me.email);
    res.json({ track718 });
  })
);

operatorRouter.delete(
  "/orders/:id/sub-orders/:subId/trucks/:truckId/track718",
  asyncHandler(async (req, res) => {
    const me = (req as AuthedRequest).user!;
    await requireLinkedSubOrder(me.id, req.params.id, req.params.subId);
    const truck = await assertTruckMutable(req.params.truckId, req.params.subId);
    await prisma.track718Tracking.deleteMany({ where: { truckId: truck.id } });
    await touchSubOrderEditor(req.params.subId, me.email);
    res.json({ ok: true });
  })
);

operatorRouter.post(
  "/orders/:id/sub-orders/:subId/cancel",
  asyncHandler(async (req, res) => {
    const me = (req as AuthedRequest).user!;
    await requireLinkedSubOrder(me.id, req.params.id, req.params.subId);
    await assertSubOrderMutable(req.params.subId);
    await cancelSubOrder(req.params.subId, req.params.id);
    res.json({ ok: true });
  })
);

operatorRouter.post(
  "/orders/:id/sub-orders/:subId/trucks/:truckId/cancel",
  asyncHandler(async (req, res) => {
    const me = (req as AuthedRequest).user!;
    await requireLinkedSubOrder(me.id, req.params.id, req.params.subId);
    await assertTruckMutable(req.params.truckId, req.params.subId);
    await cancelTruck(req.params.truckId, req.params.subId);
    res.json({ ok: true });
  })
);

operatorRouter.delete(
  "/orders/:id/sub-orders/:subId/trucks/:truckId",
  asyncHandler(async (req, res) => {
    const me = (req as AuthedRequest).user!;
    await requireLinkedSubOrder(me.id, req.params.id, req.params.subId);
    await assertTruckMutable(req.params.truckId, req.params.subId);
    await cancelTruck(req.params.truckId, req.params.subId);
    res.json({ ok: true });
  })
);

operatorRouter.post(
  "/orders/:id/sub-orders/:subId/assignments",
  asyncHandler(async (req, res) => {
    const me = (req as AuthedRequest).user!;
    await requireLinkedSubOrder(me.id, req.params.id, req.params.subId);
    await assertSubOrderMutable(req.params.subId);
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
    await assertSubOrderMutable(req.params.subId);
    const result = await regenerateDriverAssignment(req.params.assignmentId, req.params.subId);
    res.json(result);
  })
);

operatorRouter.delete(
  "/orders/:id/sub-orders/:subId/assignments/:assignmentId",
  asyncHandler(async (req, res) => {
    const me = (req as AuthedRequest).user!;
    await requireLinkedSubOrder(me.id, req.params.id, req.params.subId);
    await assertSubOrderMutable(req.params.subId);
    await revokeDriverAssignment(req.params.assignmentId, req.params.subId);
    res.json({ ok: true });
  })
);

operatorRouter.post(
  "/orders/:id/sub-orders/:subId/transfers",
  asyncHandler(async (req, res) => {
    const me = (req as AuthedRequest).user!;
    await requireLinkedSubOrder(me.id, req.params.id, req.params.subId);
    const [transfer] = await Promise.all([
      createCargoTransfer({
        subOrderId: req.params.subId,
        body: req.body as Record<string, unknown>,
        gpsNumber: optionalString(req.body?.gpsNumber),
      }),
      touchSubOrderEditor(req.params.subId, me.email),
    ]);
    res.json({ transfer });
  })
);
