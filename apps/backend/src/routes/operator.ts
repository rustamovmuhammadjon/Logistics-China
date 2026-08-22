import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { notFound, unauthorized } from "../lib/errors.js";
import { optionalString, requiredString } from "../lib/input.js";
import { detailInclude } from "../lib/orders.js";
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
