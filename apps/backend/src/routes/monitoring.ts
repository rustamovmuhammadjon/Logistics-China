import { Router } from "express";
import { truckStats } from "@logistics/shared";
import { prisma } from "../lib/prisma.js";
import { notFound } from "../lib/errors.js";
import { buildOrderOrderBy, buildOrderWhere, detailInclude, getViewerContext, listIncludeWithPeople, scopeOrderWhere, viewerCanAccessOrder, withOrderPeople } from "../lib/orders.js";
import { toPublicUser } from "../lib/auth.js";
import { asyncHandler } from "../middleware/errors.js";
import { requireAnyAuth, type AuthedRequest } from "../middleware/auth.js";

export const monitoringRouter = Router();

monitoringRouter.use(requireAnyAuth);

monitoringRouter.get(
  "/orders",
  asyncHandler(async (req, res) => {
    const { isAdmin, user } = req as AuthedRequest;
    const completed = req.query.completed === "1" || req.query.completed === "true";
    const q = typeof req.query.q === "string" ? req.query.q : undefined;
    const sort = typeof req.query.sort === "string" ? req.query.sort : undefined;

    const ctx = await getViewerContext(isAdmin, user);
    const orders = await prisma.groupOrder.findMany({
      where: scopeOrderWhere(ctx, buildOrderWhere(completed, q)),
      include: listIncludeWithPeople,
      orderBy: buildOrderOrderBy(sort),
    });

    const stats = truckStats(orders.flatMap((o) => o.subOrders.flatMap((s) => s.trucks)));
    res.json({ orders: orders.map(withOrderPeople), ctx, stats });
  })
);

monitoringRouter.get(
  "/sidebar",
  asyncHandler(async (req, res) => {
    const { isAdmin, user } = req as AuthedRequest;
    const ctx = await getViewerContext(isAdmin, user);
    const [orders, me] = await Promise.all([
      prisma.groupOrder.findMany({
        where: scopeOrderWhere(ctx, { arrivedAt: null }),
        select: { id: true, name: true, ownerId: true },
        orderBy: { createdAt: "desc" },
      }),
      Promise.resolve({ admin: isAdmin, user }),
    ]);
    res.json({
      orders,
      ctx,
      admin: me.admin,
      user: me.user ? toPublicUser(me.user) : null,
    });
  })
);

monitoringRouter.get(
  "/orders/:id",
  asyncHandler(async (req, res) => {
    const { isAdmin, user } = req as AuthedRequest;
    const ctx = await getViewerContext(isAdmin, user);
    const order = await prisma.groupOrder.findUnique({
      where: { id: req.params.id },
      include: detailInclude,
    });
    if (!order || !viewerCanAccessOrder(ctx, order.ownerId)) notFound();
    res.json({ order });
  })
);
