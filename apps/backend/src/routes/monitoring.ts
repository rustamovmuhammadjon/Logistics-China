import { Router } from "express";
import { truckStats } from "@logistics/shared";
import { prisma } from "../lib/prisma.js";
import { notFound } from "../lib/errors.js";
import {
  buildOrderOrderBy,
  buildOrderWhere,
  detailInclude,
  getViewerContext,
  listIncludeWithPeople,
  orderVisibilityWhere,
  stripGpsNumber,
  withOrderPeople,
} from "../lib/orders.js";
import { buildOrdersWorkbook } from "../lib/export.js";
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
    const canceled = req.query.canceled === "1" || req.query.canceled === "true";
    const q = typeof req.query.q === "string" ? req.query.q : undefined;
    const sort = typeof req.query.sort === "string" ? req.query.sort : undefined;

    const [ctx, visibility] = await Promise.all([
      getViewerContext(isAdmin, user),
      orderVisibilityWhere({ isAdmin, user }),
    ]);
    const orders = await prisma.groupOrder.findMany({
      where: { AND: [buildOrderWhere(completed, q, canceled), visibility] },
      include: listIncludeWithPeople,
      orderBy: buildOrderOrderBy(sort),
    });

    const stats = truckStats(orders.flatMap((o) => o.subOrders.flatMap((s) => s.trucks)));
    // GPS number is operator/admin only — every other viewer here (an
    // individual, a company, or an employee) never receives it.
    const canSeeGps = isAdmin || user?.role === "OPERATOR";
    const mapped = orders.map(withOrderPeople);
    res.json({
      orders: canSeeGps ? mapped : mapped.map(stripGpsNumber),
      ctx,
      stats,
      user: user ? toPublicUser(user) : null,
    });
  })
);

monitoringRouter.get(
  "/export",
  asyncHandler(async (req, res) => {
    const { isAdmin, user } = req as AuthedRequest;
    const completed = req.query.completed === "1" || req.query.completed === "true";
    const canceled = req.query.canceled === "1" || req.query.canceled === "true";

    // Same visibility scoping as the on-screen list — a consignee only ever
    // gets their own orders, an operator only their linked consignees', so
    // this can never leak another user's data regardless of what's passed
    // in the query string.
    const visibility = await orderVisibilityWhere({ isAdmin, user });
    const orders = await prisma.groupOrder.findMany({
      where: { AND: [buildOrderWhere(completed, undefined, canceled), visibility] },
      include: listIncludeWithPeople,
      orderBy: buildOrderOrderBy(undefined),
    });

    const canSeeGps = isAdmin || user?.role === "OPERATOR";
    const mapped = orders.map(withOrderPeople);
    const buffer = await buildOrdersWorkbook(canSeeGps ? mapped : mapped.map(stripGpsNumber), { includePeople: isAdmin });
    const label = canceled ? "cancelled" : completed ? "completed" : "active";
    const filename = `orders-${label}-${new Date().toISOString().slice(0, 10)}.xlsx`;

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
  })
);

monitoringRouter.get(
  "/sidebar",
  asyncHandler(async (req, res) => {
    const { isAdmin, user } = req as AuthedRequest;
    const [ctx, visibility] = await Promise.all([
      getViewerContext(isAdmin, user),
      orderVisibilityWhere({ isAdmin, user }),
    ]);
    const [orders, me] = await Promise.all([
      prisma.groupOrder.findMany({
        where: { AND: [buildOrderWhere(false), visibility] },
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
    const visibility = await orderVisibilityWhere({ isAdmin, user });
    const order = await prisma.groupOrder.findFirst({
      where: { AND: [{ id: req.params.id }, visibility] },
      include: detailInclude,
    });
    if (!order) notFound();
    const canSeeGps = isAdmin || user?.role === "OPERATOR";
    res.json({ order: canSeeGps ? order : stripGpsNumber(order) });
  })
);
