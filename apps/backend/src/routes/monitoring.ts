import { Router } from "express";
import { truckStats } from "@logistics/shared";
import { prisma } from "../lib/prisma.js";
import { notFound } from "../lib/errors.js";
import { buildOrderOrderBy, buildOrderWhere, detailInclude, getViewerContext, listInclude } from "../lib/orders.js";
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

    const [orders, ctx] = await Promise.all([
      prisma.groupOrder.findMany({
        where: buildOrderWhere(completed, q),
        include: listInclude,
        orderBy: buildOrderOrderBy(sort),
      }),
      getViewerContext(isAdmin, user),
    ]);

    const stats = truckStats(orders.flatMap((o) => o.subOrders.flatMap((s) => s.trucks)));
    res.json({ orders, ctx, stats });
  })
);

monitoringRouter.get(
  "/sidebar",
  asyncHandler(async (req, res) => {
    const { isAdmin, user } = req as AuthedRequest;
    const [orders, ctx, me] = await Promise.all([
      prisma.groupOrder.findMany({
        where: { arrivedAt: null },
        select: { id: true, name: true, ownerId: true },
        orderBy: { createdAt: "desc" },
      }),
      getViewerContext(isAdmin, user),
      Promise.resolve({ admin: isAdmin, user }),
    ]);
    res.json({
      orders,
      ctx,
      admin: me.admin,
      user: me.user
        ? {
            id: me.user.id,
            email: me.user.email,
            role: me.user.role,
            firstName: me.user.firstName,
            lastName: me.user.lastName,
            phone: me.user.phone,
            photoUrl: me.user.photoUrl,
            linkCode: me.user.linkCode,
          }
        : null,
    });
  })
);

monitoringRouter.get(
  "/orders/:id",
  asyncHandler(async (req, res) => {
    const order = await prisma.groupOrder.findUnique({
      where: { id: req.params.id },
      include: detailInclude,
    });
    if (!order) notFound();
    res.json({ order });
  })
);
