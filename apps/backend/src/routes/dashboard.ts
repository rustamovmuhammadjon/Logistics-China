import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { listInclude, orderVisibilityWhere, stripGpsNumber } from "../lib/orders.js";
import { toPublicUser } from "../lib/auth.js";
import { asyncHandler } from "../middleware/errors.js";
import { requireRegisteredUser, type AuthedRequest } from "../middleware/auth.js";

export const dashboardRouter = Router();

dashboardRouter.use(requireRegisteredUser);

dashboardRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const me = (req as AuthedRequest).user!;

    if (me.role === "CONSIGNEE") {
      const [orders, links] = await Promise.all([
        prisma.groupOrder.findMany({
          where: { ownerId: me.id },
          include: listInclude,
          orderBy: { createdAt: "desc" },
        }),
        prisma.operatorLink.findMany({
          where: { consigneeId: me.id },
          include: { operator: true, orderGrants: { select: { groupOrderId: true } } },
          orderBy: { createdAt: "desc" },
        }),
      ]);
      res.json({
        user: toPublicUser(me),
        orders: orders.map(stripGpsNumber),
        links: links.map((l) => ({
          linkId: l.id,
          email: l.operator.email,
          createdAt: l.createdAt,
          scope: l.scope,
          grantedOrderIds: l.orderGrants.map((g) => g.groupOrderId),
        })),
      });
      return;
    }

    if (me.role === "COMPANY") {
      // A company never manages operator links itself — each employee links
      // their own operators for the orders they create.
      const orders = await prisma.groupOrder.findMany({
        where: { ownerId: me.id },
        include: listInclude,
        orderBy: { createdAt: "desc" },
      });
      res.json({ user: toPublicUser(me), orders: orders.map(stripGpsNumber), links: [] });
      return;
    }

    if (me.role === "EMPLOYEE") {
      // An employee's orders are owned by their company, not themselves,
      // but their operator links are their own — scoped to the orders they
      // personally create, separate from any other employee's links.
      const [orders, links] = me.companyId
        ? await Promise.all([
            prisma.groupOrder.findMany({
              where: { ownerId: me.companyId },
              include: listInclude,
              orderBy: { createdAt: "desc" },
            }),
            prisma.operatorLink.findMany({
              where: { consigneeId: me.id },
              include: { operator: true, orderGrants: { select: { groupOrderId: true } } },
              orderBy: { createdAt: "desc" },
            }),
          ])
        : [[], []];
      res.json({
        user: toPublicUser(me),
        orders: orders.map(stripGpsNumber),
        links: links.map((l) => ({
          linkId: l.id,
          email: l.operator.email,
          createdAt: l.createdAt,
          scope: l.scope,
          grantedOrderIds: l.orderGrants.map((g) => g.groupOrderId),
        })),
      });
      return;
    }

    if (me.role === "OPERATOR_COMPANY") {
      // A "company for tracking" never has orders or links of its own —
      // only its OPERATOR employees do (see operatorCompany.ts). This route
      // exists so the shared /dashboard page can still resolve its role.
      res.json({ user: toPublicUser(me), orders: [], links: [] });
      return;
    }

    const [links, visibility] = await Promise.all([
      prisma.operatorLink.findMany({
        where: { operatorId: me.id },
        include: { consignee: true },
        orderBy: { createdAt: "desc" },
      }),
      orderVisibilityWhere({ isAdmin: false, user: me }),
    ]);
    const orders = await prisma.groupOrder.findMany({
      where: visibility,
      include: listInclude,
      orderBy: { createdAt: "desc" },
    });

    res.json({
      user: toPublicUser(me),
      orders,
      links: links.map((l) => ({
        linkId: l.id,
        email: l.consignee.email,
        createdAt: l.createdAt,
      })),
    });
  })
);
