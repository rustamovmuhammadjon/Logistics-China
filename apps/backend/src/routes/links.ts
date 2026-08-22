import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { badRequest, unauthorized } from "../lib/errors.js";
import { requiredString } from "../lib/input.js";
import { asyncHandler } from "../middleware/errors.js";
import { requireRegisteredUser, type AuthedRequest } from "../middleware/auth.js";

export const linksRouter = Router();

linksRouter.use(requireRegisteredUser);

linksRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const me = (req as AuthedRequest).user!;
    const code = requiredString(req.body?.code, "code").trim();
    const other = await prisma.user.findUnique({ where: { linkCode: code } });
    if (!other) badRequest("No account found with that ID");
    if (other.role === me.role) {
      badRequest(`That ID belongs to another ${other.role.toLowerCase()} — you need the opposite type`);
    }

    const consigneeId = me.role === "CONSIGNEE" ? me.id : other.id;
    const operatorId = me.role === "OPERATOR" ? me.id : other.id;

    try {
      const link = await prisma.operatorLink.create({ data: { consigneeId, operatorId } });
      res.json({ link });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        badRequest("Already linked with that account");
      }
      throw err;
    }
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
