import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { badRequest, unauthorized } from "../lib/errors.js";
import { requiredString } from "../lib/input.js";
import { asyncHandler } from "../middleware/errors.js";
import { requireRegisteredUser, type AuthedRequest } from "../middleware/auth.js";

export const linksRouter = Router();

linksRouter.use(requireRegisteredUser);

function orderIdsFromBody(body: Record<string, unknown>): string[] {
  return Array.isArray(body.orderIds) ? body.orderIds.filter((id): id is string => typeof id === "string") : [];
}

// A company's own account manages operator links on behalf of all its
// employees — an individual entrepreneur (CONSIGNEE) does the same for
// themselves. Employees never manage links directly.
function isConsigneeSide(role: string) {
  return role === "CONSIGNEE" || role === "COMPANY";
}

linksRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const me = (req as AuthedRequest).user!;
    if (me.role === "EMPLOYEE") badRequest("Employees can't manage links — ask your company to do this.");
    const code = requiredString(req.body?.code, "code").trim();
    const other = await prisma.user.findUnique({ where: { linkCode: code } });
    if (!other) badRequest("No account found with that ID");
    if (other.role === "EMPLOYEE") badRequest("That ID belongs to an employee — link with their company instead.");

    const meIsConsigneeSide = isConsigneeSide(me.role);
    const otherIsConsigneeSide = isConsigneeSide(other.role);
    if (meIsConsigneeSide === otherIsConsigneeSide) {
      badRequest(`That ID belongs to another ${other.role.toLowerCase()} — you need the opposite type`);
    }

    const consigneeId = meIsConsigneeSide ? me.id : other.id;
    const operatorId = meIsConsigneeSide ? other.id : me.id;

    // Visibility scope is the consignee/company's call — only apply it when
    // they're the one initiating the link. When an operator links in (using
    // the other side's ID), it always starts as ALL; the consignee/company
    // can narrow it down afterward from their linked-accounts list.
    const scope = meIsConsigneeSide && req.body?.scope === "SELECTED" ? "SELECTED" : "ALL";
    const orderIds = meIsConsigneeSide ? orderIdsFromBody(req.body ?? {}) : [];

    try {
      const link = await prisma.operatorLink.create({ data: { consigneeId, operatorId, scope } });
      if (scope === "SELECTED" && orderIds.length > 0) {
        const owned = await prisma.groupOrder.findMany({
          where: { id: { in: orderIds }, ownerId: consigneeId },
          select: { id: true },
        });
        if (owned.length > 0) {
          await prisma.operatorOrderGrant.createMany({
            data: owned.map((o) => ({ operatorLinkId: link.id, groupOrderId: o.id })),
          });
        }
      }
      res.json({ link });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        badRequest("Already linked with that account");
      }
      throw err;
    }
  })
);

// Consignee-only: change an operator's visibility scope, and (for SELECTED
// scope) update which orders are granted — but only within the set of
// orders actually shown in the edit UI (e.g. a since-completed order the
// consignee never saw in this session keeps whatever grant it already had).
linksRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const me = (req as AuthedRequest).user!;
    const link = await prisma.operatorLink.findUnique({ where: { id: req.params.id } });
    if (!link || link.consigneeId !== me.id) unauthorized();

    const scope = req.body?.scope === "SELECTED" ? "SELECTED" : "ALL";

    await prisma.$transaction(async (tx) => {
      await tx.operatorLink.update({ where: { id: link.id }, data: { scope } });
      if (scope === "ALL") {
        // Grants are meaningless once the link sees everything — clear
        // them so a later switch back to SELECTED starts from a clean slate.
        await tx.operatorOrderGrant.deleteMany({ where: { operatorLinkId: link.id } });
        return;
      }

      const checkedIds = orderIdsFromBody(req.body ?? {});
      const visibleIds: string[] = Array.isArray(req.body?.visibleOrderIds)
        ? req.body.visibleOrderIds.filter((id: unknown): id is string => typeof id === "string")
        : checkedIds;

      const owned = await tx.groupOrder.findMany({
        where: { id: { in: checkedIds }, ownerId: me.id },
        select: { id: true },
      });
      const ownedIds = new Set(owned.map((o) => o.id));
      const toRemove = visibleIds.filter((id: string) => !ownedIds.has(id));

      if (toRemove.length > 0) {
        await tx.operatorOrderGrant.deleteMany({ where: { operatorLinkId: link.id, groupOrderId: { in: toRemove } } });
      }
      if (ownedIds.size > 0) {
        await tx.operatorOrderGrant.createMany({
          data: [...ownedIds].map((id) => ({ operatorLinkId: link.id, groupOrderId: id })),
          skipDuplicates: true,
        });
      }
    });

    res.json({ ok: true });
  })
);

linksRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const me = (req as AuthedRequest).user!;
    const link = await prisma.operatorLink.findUnique({ where: { id: req.params.id } });
    if (!link || (link.consigneeId !== me.id && link.operatorId !== me.id)) unauthorized();
    await prisma.operatorLink.delete({ where: { id: link.id } });
    res.json({ ok: true });
  })
);
