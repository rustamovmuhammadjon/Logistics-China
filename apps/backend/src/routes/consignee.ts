import { Router } from "express";
import type { User } from "@prisma/client";
import { MAX_SUB_ORDERS_PER_BATCH } from "@logistics/shared";
import { prisma } from "../lib/prisma.js";
import { badRequest, notFound, unauthorized } from "../lib/errors.js";
import { dateOrToday, optionalDate, optionalString, requiredString } from "../lib/input.js";
import { detailInclude, effectiveOwnerId, stripGpsNumber } from "../lib/orders.js";
import { assertGroupOrderMutable, cancelGroupOrder, cancelSubOrder, completeSubOrder } from "../lib/lifecycle.js";
import { asyncHandler } from "../middleware/errors.js";
import { requireOrderCreator, requireOrderWriter, type AuthedRequest } from "../middleware/auth.js";
import { broadcastOnMutation } from "../middleware/realtime.js";

export const consigneeRouter = Router();

// Baseline: individual entrepreneurs, companies, and a company's employees
// can all view orders scoped to effectiveOwnerId. Mutating routes add
// requireOrderWriter on top (a company itself can never write) and, for an
// employee, requireOwnedOrder also checks they created the specific order —
// employees can see every company order but never edit each other's.
consigneeRouter.use(requireOrderCreator);
consigneeRouter.use(broadcastOnMutation);

async function requireOwnedOrder(orderId: string, me: Pick<User, "id" | "role" | "companyId">) {
  const order = await prisma.groupOrder.findUnique({ where: { id: orderId } });
  if (!order || order.ownerId !== effectiveOwnerId(me)) unauthorized();
  if (me.role === "EMPLOYEE" && order.createdByUserId !== me.id) {
    unauthorized("Only the employee who created this order can change it.");
  }
  return order;
}

function orderFields(body: Record<string, unknown>) {
  return {
    name: requiredString(body.name, "name"),
    openedAt: optionalDate(body.openedAt),
    pol: optionalString(body.pol),
    origin: optionalString(body.origin),
    destination: optionalString(body.destination),
    commodity: optionalString(body.commodity),
  };
}

consigneeRouter.post(
  "/orders",
  requireOrderWriter,
  asyncHandler(async (req, res) => {
    const me = (req as AuthedRequest).user!;
    const ownerId = effectiveOwnerId(me);
    const fields = orderFields(req.body);
    const order = await prisma.groupOrder.create({
      data: { ownerId, createdByUserId: me.id, ...fields, openedAt: fields.openedAt ?? new Date() },
    });

    // Only relevant once 2+ SELECTED-scope operators are linked — grants
    // this order to whichever links were picked at creation time. ALL-scope
    // operators already see every order and need no grant.
    const linkIds = Array.isArray(req.body?.linkIds)
      ? req.body.linkIds.filter((id: unknown): id is string => typeof id === "string")
      : [];
    if (linkIds.length > 0) {
      // Operator links now belong to whoever created them (the individual
      // entrepreneur or the specific employee), not the order's owner.
      const selectedLinks = await prisma.operatorLink.findMany({
        where: { id: { in: linkIds }, consigneeId: me.id, scope: "SELECTED" },
        select: { id: true },
      });
      if (selectedLinks.length > 0) {
        await prisma.operatorOrderGrant.createMany({
          data: selectedLinks.map((link) => ({ operatorLinkId: link.id, groupOrderId: order.id })),
          skipDuplicates: true,
        });
      }
    }

    res.json({ order });
  })
);

consigneeRouter.get(
  "/orders",
  asyncHandler(async (req, res) => {
    const me = (req as AuthedRequest).user!;
    const orders = await prisma.groupOrder.findMany({
      where: { ownerId: effectiveOwnerId(me) },
      include: detailInclude,
      orderBy: { createdAt: "desc" },
    });
    res.json({ orders: orders.map(stripGpsNumber) });
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
    if (!order || order.ownerId !== effectiveOwnerId(me)) notFound();
    res.json({ order: stripGpsNumber(order) });
  })
);

consigneeRouter.patch(
  "/orders/:id",
  requireOrderWriter,
  asyncHandler(async (req, res) => {
    const me = (req as AuthedRequest).user!;
    await requireOwnedOrder(req.params.id, me);
    await assertGroupOrderMutable(req.params.id);
    const fields = orderFields(req.body);
    const order = await prisma.groupOrder.update({
      where: { id: req.params.id },
      data: fields,
      include: detailInclude,
    });
    res.json({ order: stripGpsNumber(order) });
  })
);

consigneeRouter.post(
  "/orders/:id/cancel",
  requireOrderWriter,
  asyncHandler(async (req, res) => {
    const me = (req as AuthedRequest).user!;
    await requireOwnedOrder(req.params.id, me);
    await assertGroupOrderMutable(req.params.id);
    await cancelGroupOrder(req.params.id);
    res.json({ ok: true });
  })
);

consigneeRouter.delete(
  "/orders/:id",
  requireOrderWriter,
  asyncHandler(async (req, res) => {
    const me = (req as AuthedRequest).user!;
    await requireOwnedOrder(req.params.id, me);
    await assertGroupOrderMutable(req.params.id);
    await cancelGroupOrder(req.params.id);
    res.json({ ok: true });
  })
);

function requiredBatchCount(value: unknown): number {
  const count = Math.trunc(Number(value));
  if (!Number.isFinite(count) || count < 1) {
    badRequest("Enter how many sub-orders (FTLs) to create");
  }
  if (count > MAX_SUB_ORDERS_PER_BATCH) {
    badRequest(`You can create at most ${MAX_SUB_ORDERS_PER_BATCH} sub-orders at once`);
  }
  return count;
}

consigneeRouter.post(
  "/orders/:id/sub-orders",
  requireOrderWriter,
  asyncHandler(async (req, res) => {
    const me = (req as AuthedRequest).user!;
    await requireOwnedOrder(req.params.id, me);
    await assertGroupOrderMutable(req.params.id);
    const count = requiredBatchCount(req.body?.count);
    const openedAt = dateOrToday(req.body?.openedAt);

    // Sub-orders are numbered in one continuous sequence per order — "1",
    // "2", "3", ... — so count every sub-order ever created here (not just
    // currently OPEN ones), and a later batch always continues on from the
    // last number used, even if earlier ones were renamed or cancelled.
    // Factory load date is operator-only (set later via PATCH
    // .../sub-orders/:subId on the operator router) — a consignee/employee
    // never sets it at creation.
    const existingCount = await prisma.subOrder.count({ where: { groupOrderId: req.params.id } });
    await prisma.subOrder.createMany({
      data: Array.from({ length: count }, (_, i) => ({
        groupOrderId: req.params.id,
        name: String(existingCount + i + 1),
        openedAt,
        status: "OPEN" as const,
      })),
    });
    res.json({ count });
  })
);

consigneeRouter.patch(
  "/orders/:id/sub-orders/:subId",
  requireOrderWriter,
  asyncHandler(async (req, res) => {
    const me = (req as AuthedRequest).user!;
    await requireOwnedOrder(req.params.id, me);
    await assertGroupOrderMutable(req.params.id);
    const existing = await prisma.subOrder.findUnique({ where: { id: req.params.subId } });
    if (!existing || existing.groupOrderId !== req.params.id) notFound();
    if (existing.status !== "OPEN") badRequest("This sub-order cannot be changed");
    const subOrder = await prisma.subOrder.update({
      where: { id: existing.id },
      data: { name: optionalString(req.body?.name) },
    });
    res.json({ subOrder });
  })
);

consigneeRouter.post(
  "/orders/:id/sub-orders/:subId/complete",
  requireOrderWriter,
  asyncHandler(async (req, res) => {
    const me = (req as AuthedRequest).user!;
    await requireOwnedOrder(req.params.id, me);
    await assertGroupOrderMutable(req.params.id);
    await completeSubOrder(req.params.subId, req.params.id);
    res.json({ ok: true });
  })
);

consigneeRouter.post(
  "/orders/:id/sub-orders/:subId/cancel",
  requireOrderWriter,
  asyncHandler(async (req, res) => {
    const me = (req as AuthedRequest).user!;
    await requireOwnedOrder(req.params.id, me);
    await assertGroupOrderMutable(req.params.id);
    await cancelSubOrder(req.params.subId, req.params.id);
    res.json({ ok: true });
  })
);

consigneeRouter.delete(
  "/orders/:id/sub-orders/:subId",
  requireOrderWriter,
  asyncHandler(async (req, res) => {
    const me = (req as AuthedRequest).user!;
    await requireOwnedOrder(req.params.id, me);
    await assertGroupOrderMutable(req.params.id);
    await cancelSubOrder(req.params.subId, req.params.id);
    res.json({ ok: true });
  })
);
