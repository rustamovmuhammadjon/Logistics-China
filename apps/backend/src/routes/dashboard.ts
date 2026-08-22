import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { listInclude } from "../lib/orders.js";
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
          include: { operator: true },
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
        })),
      });
      return;
    }

    const links = await prisma.operatorLink.findMany({
      where: { operatorId: me.id },
      include: { consignee: true },
      orderBy: { createdAt: "desc" },
    });
    const consigneeIds = links.map((l) => l.consigneeId);
    const orders = consigneeIds.length
      ? await prisma.groupOrder.findMany({
          where: { ownerId: { in: consigneeIds } },
          include: listInclude,
          orderBy: { createdAt: "desc" },
        })
      : [];

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
