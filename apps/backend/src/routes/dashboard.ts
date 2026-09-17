import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { listInclude, orderVisibilityWhere } from "../lib/orders.js";
import { toPublicUser } from "../lib/auth.js";
import { asyncHandler } from "../middleware/errors.js";
import { requireRegisteredUser, type AuthedRequest } from "../middleware/auth.js";

export const dashboardRouter = Router();

dashboardRouter.use(requireRegisteredUser);

dashboardRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const me = (req as AuthedRequest).user!;

    if (me.role === "CONSIGNEE" || me.role === "COMPANY") {
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
        orders,
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

    if (me.role === "EMPLOYEE") {
      // An employee's orders are owned by their company, not themselves —
      // and employees never manage operator links (their company does).
      const orders = me.companyId
        ? await prisma.groupOrder.findMany({
            where: { ownerId: me.companyId },
            include: listInclude,
            orderBy: { createdAt: "desc" },
          })
        : [];
      res.json({ user: toPublicUser(me), orders, links: [] });
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
