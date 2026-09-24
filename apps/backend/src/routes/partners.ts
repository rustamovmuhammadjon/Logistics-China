import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { badRequest, unauthorized } from "../lib/errors.js";
import { requiredString } from "../lib/input.js";
import { asyncHandler } from "../middleware/errors.js";
import { requireRegisteredUser, type AuthedRequest } from "../middleware/auth.js";
import { broadcastOnMutation } from "../middleware/realtime.js";

// COMPANY ("company for orders") <-> OPERATOR_COMPANY ("company for
// tracking") partnerships — a different relationship from OperatorLink:
// no scope, no per-order grants, just two companies agreeing to see each
// other's roster so their people know who to link with. Never confuse
// this with OperatorLink, or with the COMPANY/OPERATOR_COMPANY split
// itself.
export const partnersRouter = Router();

partnersRouter.use(requireRegisteredUser);
partnersRouter.use(broadcastOnMutation);

const memberSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  linkCode: true,
  active: true,
} as const;

const partnerSelect = {
  id: true,
  companyName: true,
  email: true,
  linkCode: true,
} as const;

function partnerRoot(me: { id: string; role: string; companyId: string | null }): { rootId: string; side: "company" | "operatorCompany" } | null {
  if (me.role === "COMPANY") return { rootId: me.id, side: "company" };
  if (me.role === "EMPLOYEE" && me.companyId) return { rootId: me.companyId, side: "company" };
  if (me.role === "OPERATOR_COMPANY") return { rootId: me.id, side: "operatorCompany" };
  if (me.role === "OPERATOR" && me.companyId) return { rootId: me.companyId, side: "operatorCompany" };
  return null;
}

partnersRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const me = (req as AuthedRequest).user!;
    const root = partnerRoot(me);
    if (!root) {
      res.json({ partners: [] });
      return;
    }

    if (root.side === "company") {
      const links = await prisma.companyPartnerLink.findMany({
        where: { companyId: root.rootId },
        include: {
          operatorCompany: {
            select: { ...partnerSelect, employees: { where: { role: "OPERATOR" }, select: memberSelect } },
          },
        },
        orderBy: { createdAt: "desc" },
      });
      res.json({
        partners: links.map((link) => ({
          linkId: link.id,
          createdAt: link.createdAt,
          partner: {
            id: link.operatorCompany.id,
            companyName: link.operatorCompany.companyName,
            email: link.operatorCompany.email,
            linkCode: link.operatorCompany.linkCode,
          },
          members: link.operatorCompany.employees,
        })),
      });
      return;
    }

    const links = await prisma.companyPartnerLink.findMany({
      where: { operatorCompanyId: root.rootId },
      include: {
        company: {
          select: { ...partnerSelect, employees: { where: { role: "EMPLOYEE" }, select: memberSelect } },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({
      partners: links.map((link) => ({
        linkId: link.id,
        createdAt: link.createdAt,
        partner: {
          id: link.company.id,
          companyName: link.company.companyName,
          email: link.company.email,
          linkCode: link.company.linkCode,
        },
        members: link.company.employees,
      })),
    });
  })
);

// Only a COMPANY or OPERATOR_COMPANY account itself creates/removes a
// partnership — their employees/operators only ever view it (above).
partnersRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const me = (req as AuthedRequest).user!;
    if (me.role !== "COMPANY" && me.role !== "OPERATOR_COMPANY") {
      badRequest("Only a company account can link with a partner.");
    }
    const code = requiredString(req.body?.code, "code").trim();
    const other = await prisma.user.findUnique({ where: { linkCode: code } });
    if (!other) badRequest("No account found with that ID");

    const companyId = me.role === "COMPANY" ? me.id : other.id;
    const operatorCompanyId = me.role === "COMPANY" ? other.id : me.id;
    if (other.role !== (me.role === "COMPANY" ? "OPERATOR_COMPANY" : "COMPANY")) {
      badRequest(
        me.role === "COMPANY"
          ? "That ID doesn't belong to a tracking company."
          : "That ID doesn't belong to a company."
      );
    }

    try {
      const link = await prisma.companyPartnerLink.create({ data: { companyId, operatorCompanyId } });
      res.json({ link });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        badRequest("Already partnered with that company");
      }
      throw err;
    }
  })
);

partnersRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const me = (req as AuthedRequest).user!;
    if (me.role !== "COMPANY" && me.role !== "OPERATOR_COMPANY") unauthorized();
    const link = await prisma.companyPartnerLink.findUnique({ where: { id: req.params.id } });
    if (!link || (link.companyId !== me.id && link.operatorCompanyId !== me.id)) unauthorized();
    await prisma.companyPartnerLink.delete({ where: { id: link.id } });
    res.json({ ok: true });
  })
);
