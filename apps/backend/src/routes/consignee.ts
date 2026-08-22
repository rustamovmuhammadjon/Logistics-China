import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { notFound, unauthorized } from "../lib/errors.js";
import { optionalDate, optionalString, requiredString } from "../lib/input.js";
import { detailInclude } from "../lib/orders.js";
import { asyncHandler } from "../middleware/errors.js";
import { requireConsignee, type AuthedRequest } from "../middleware/auth.js";

export const consigneeRouter = Router();

consigneeRouter.use(requireConsignee);

async function requireOwnedOrder(orderId: string, consigneeId: string) {
  const order = await prisma.groupOrder.findUnique({ where: { id: orderId } });
  if (!order || order.ownerId !== consigneeId) unauthorized();
  return order;
}

function orderFields(body: Record<string, unknown>) {
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
  };
}

consigneeRouter.post(
  "/orders",
  asyncHandler(async (req, res) => {
    const me = (req as AuthedRequest).user!;
    const fields = orderFields(req.body);
    const order = await prisma.groupOrder.create({
      data: { ownerId: me.id, ...fields },
    });
    res.json({ order });
  })
);

consigneeRouter.get(
  "/orders/:id",
  asyncHandler(async (req, res) => {
    const me = (req as AuthedRequest).user!;
    const order = await prisma.groupOrder.findUnique({
      where: { id: req.params.id },
      include: detailInclude,
    });
    if (!order || order.ownerId !== me.id) notFound();
    res.json({ order });
  })
);

consigneeRouter.patch(
  "/orders/:id",
  asyncHandler(async (req, res) => {
    const me = (req as AuthedRequest).user!;
    await requireOwnedOrder(req.params.id, me.id);
    const fields = orderFields(req.body);
    const order = await prisma.groupOrder.update({
      where: { id: req.params.id },
      data: fields,
      include: detailInclude,
    });
    res.json({ order });
  })
);

consigneeRouter.delete(
  "/orders/:id",
  asyncHandler(async (req, res) => {
    const me = (req as AuthedRequest).user!;
    await requireOwnedOrder(req.params.id, me.id);
    await prisma.groupOrder.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  })
);

consigneeRouter.post(
  "/orders/:id/sub-orders",
  asyncHandler(async (req, res) => {
    const me = (req as AuthedRequest).user!;
    await requireOwnedOrder(req.params.id, me.id);
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

consigneeRouter.patch(
  "/orders/:id/sub-orders/:subId",
  asyncHandler(async (req, res) => {
    const me = (req as AuthedRequest).user!;
    await requireOwnedOrder(req.params.id, me.id);
    const arrivedAt = optionalDate(req.body?.arrivedAt);
    const subOrder = await prisma.subOrder.update({
      where: { id: req.params.subId },
      data: {
        name: optionalString(req.body?.name),
        openedAt: optionalDate(req.body?.openedAt),
        arrivedAt,
        status: arrivedAt ? "CLOSED" : "OPEN",
      },
    });
    res.json({ subOrder });
  })
);

consigneeRouter.delete(
  "/orders/:id/sub-orders/:subId",
  asyncHandler(async (req, res) => {
    const me = (req as AuthedRequest).user!;
    await requireOwnedOrder(req.params.id, me.id);
    await prisma.subOrder.delete({ where: { id: req.params.subId } });
    res.json({ ok: true });
  })
);
