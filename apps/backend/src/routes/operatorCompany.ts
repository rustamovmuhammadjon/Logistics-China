import { Router } from "express";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { EMAIL_PATTERN, MIN_PASSWORD_LENGTH, isLettersOnly } from "@logistics/shared";
import { prisma } from "../lib/prisma.js";
import { badRequest, notFound } from "../lib/errors.js";
import { optionalString, parseDateOfBirth, requiredString } from "../lib/input.js";
import { generateUniqueLinkCode, toPublicUser } from "../lib/auth.js";
import { asyncHandler } from "../middleware/errors.js";
import { requireOperatorCompany, type AuthedRequest } from "../middleware/auth.js";

// "Company for tracking" — a completely separate account type from
// company.ts's "company for orders". Its employees are OPERATORs (role
// unchanged, so they work exactly as a standalone operator always has),
// not EMPLOYEEs. Never mix the two routers up.
export const operatorCompanyRouter = Router();

operatorCompanyRouter.use(requireOperatorCompany);

function operatorFields(body: Record<string, unknown>) {
  const email = String(body.email ?? "").trim().toLowerCase();
  const firstName = String(body.firstName ?? "").trim();
  const lastName = String(body.lastName ?? "").trim();
  if (!EMAIL_PATTERN.test(email)) badRequest("Enter a valid email address");
  if (!firstName || !isLettersOnly(firstName)) badRequest("First name is required and may only contain letters");
  if (!lastName || !isLettersOnly(lastName)) badRequest("Last name is required and may only contain letters");
  const phone = requiredString(body.phone, "phone");
  const dateOfBirth = parseDateOfBirth(body.dateOfBirth, true);
  return { email, firstName, lastName, phone, dateOfBirth };
}

async function requireOwnOperator(companyId: string, operatorId: string) {
  const operator = await prisma.user.findUnique({ where: { id: operatorId } });
  if (!operator || operator.role !== "OPERATOR" || operator.companyId !== companyId) notFound();
  return operator;
}

operatorCompanyRouter.get(
  "/operators",
  asyncHandler(async (req, res) => {
    const me = (req as AuthedRequest).user!;
    const [operators, linkCounts] = await Promise.all([
      prisma.user.findMany({ where: { companyId: me.id, role: "OPERATOR" }, orderBy: [{ active: "desc" }, { createdAt: "asc" }] }),
      prisma.operatorLink.groupBy({ by: ["operatorId"], where: { operator: { companyId: me.id } }, _count: { _all: true } }),
    ]);

    const linkCountMap = new Map(linkCounts.map((row) => [row.operatorId, row._count._all]));

    res.json({
      operators: operators.map((operator) => ({
        id: operator.id,
        email: operator.email,
        firstName: operator.firstName,
        lastName: operator.lastName,
        phone: operator.phone,
        dateOfBirth: operator.dateOfBirth ? operator.dateOfBirth.toISOString() : null,
        active: operator.active,
        createdAt: operator.createdAt,
        linkedAccountCount: linkCountMap.get(operator.id) ?? 0,
      })),
    });
  })
);

operatorCompanyRouter.post(
  "/operators",
  asyncHandler(async (req, res) => {
    const me = (req as AuthedRequest).user!;
    const fields = operatorFields(req.body ?? {});
    const password = String(req.body?.password ?? "");
    if (password.length < MIN_PASSWORD_LENGTH) {
      badRequest(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const linkCode = await generateUniqueLinkCode();

    try {
      const operator = await prisma.user.create({
        data: { ...fields, passwordHash, role: "OPERATOR", companyId: me.id, linkCode, active: true },
      });
      res.json({ operator: toPublicUser(operator) });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        badRequest("An account with this email already exists");
      }
      throw err;
    }
  })
);

operatorCompanyRouter.patch(
  "/operators/:id",
  asyncHandler(async (req, res) => {
    const me = (req as AuthedRequest).user!;
    const existing = await requireOwnOperator(me.id, req.params.id);
    const fields = operatorFields(req.body ?? {});
    const data: Prisma.UserUpdateInput = { ...fields };

    const password = optionalString(req.body?.password);
    if (password) {
      if (password.length < MIN_PASSWORD_LENGTH) {
        badRequest(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
      }
      data.passwordHash = await bcrypt.hash(password, 10);
    }

    try {
      const operator = await prisma.user.update({ where: { id: existing.id }, data });
      res.json({ operator: toPublicUser(operator) });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        badRequest("An account with this email already exists");
      }
      throw err;
    }
  })
);

operatorCompanyRouter.post(
  "/operators/:id/deactivate",
  asyncHandler(async (req, res) => {
    const me = (req as AuthedRequest).user!;
    const existing = await requireOwnOperator(me.id, req.params.id);
    await prisma.user.update({ where: { id: existing.id }, data: { active: false } });
    res.json({ ok: true });
  })
);

operatorCompanyRouter.post(
  "/operators/:id/activate",
  asyncHandler(async (req, res) => {
    const me = (req as AuthedRequest).user!;
    const existing = await requireOwnOperator(me.id, req.params.id);
    await prisma.user.update({ where: { id: existing.id }, data: { active: true } });
    res.json({ ok: true });
  })
);

operatorCompanyRouter.get(
  "/analytics",
  asyncHandler(async (req, res) => {
    const me = (req as AuthedRequest).user!;

    const [operatorCounts, totalLinkedAccounts] = await Promise.all([
      prisma.user.groupBy({ by: ["active"], where: { companyId: me.id, role: "OPERATOR" }, _count: { _all: true } }),
      prisma.operatorLink.count({ where: { operator: { companyId: me.id } } }),
    ]);

    const operatorCount = operatorCounts.reduce((sum, row) => sum + row._count._all, 0);
    const activeOperatorCount = operatorCounts.find((row) => row.active)?._count._all ?? 0;

    res.json({ operatorCount, activeOperatorCount, totalLinkedAccounts });
  })
);
