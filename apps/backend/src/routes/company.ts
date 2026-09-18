import { Router } from "express";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { EMAIL_PATTERN, isGroupOrderCompleted, MIN_PASSWORD_LENGTH, isLettersOnly } from "@logistics/shared";
import { prisma } from "../lib/prisma.js";
import { badRequest, notFound } from "../lib/errors.js";
import { optionalString, parseDateOfBirth, requiredString } from "../lib/input.js";
import { buildOrderWhere } from "../lib/orders.js";
import { generateUniqueLinkCode, toPublicUser } from "../lib/auth.js";
import { asyncHandler } from "../middleware/errors.js";
import { requireCompany, type AuthedRequest } from "../middleware/auth.js";

export const companyRouter = Router();

companyRouter.use(requireCompany);

function employeeFields(body: Record<string, unknown>) {
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

async function requireOwnEmployee(companyId: string, employeeId: string) {
  const employee = await prisma.user.findUnique({ where: { id: employeeId } });
  if (!employee || employee.companyId !== companyId) notFound();
  return employee;
}

companyRouter.get(
  "/employees",
  asyncHandler(async (req, res) => {
    const me = (req as AuthedRequest).user!;
    const [employees, totals, completed, cancelled] = await Promise.all([
      prisma.user.findMany({ where: { companyId: me.id }, orderBy: [{ active: "desc" }, { createdAt: "asc" }] }),
      prisma.groupOrder.groupBy({ by: ["createdByUserId"], where: { ownerId: me.id }, _count: { _all: true } }),
      prisma.groupOrder.groupBy({
        by: ["createdByUserId"],
        where: { ownerId: me.id, ...buildOrderWhere(true) },
        _count: { _all: true },
      }),
      prisma.groupOrder.groupBy({
        by: ["createdByUserId"],
        where: { ownerId: me.id, ...buildOrderWhere(false, undefined, true) },
        _count: { _all: true },
      }),
    ]);

    const totalsMap = new Map(totals.map((t) => [t.createdByUserId, t._count._all]));
    const completedMap = new Map(completed.map((t) => [t.createdByUserId, t._count._all]));
    const cancelledMap = new Map(cancelled.map((t) => [t.createdByUserId, t._count._all]));

    res.json({
      employees: employees.map((employee) => ({
        id: employee.id,
        email: employee.email,
        firstName: employee.firstName,
        lastName: employee.lastName,
        phone: employee.phone,
        dateOfBirth: employee.dateOfBirth ? employee.dateOfBirth.toISOString() : null,
        active: employee.active,
        createdAt: employee.createdAt,
        orderCount: totalsMap.get(employee.id) ?? 0,
        completedCount: completedMap.get(employee.id) ?? 0,
        cancelledCount: cancelledMap.get(employee.id) ?? 0,
      })),
    });
  })
);

companyRouter.post(
  "/employees",
  asyncHandler(async (req, res) => {
    const me = (req as AuthedRequest).user!;
    const fields = employeeFields(req.body ?? {});
    const password = String(req.body?.password ?? "");
    if (password.length < MIN_PASSWORD_LENGTH) {
      badRequest(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const linkCode = await generateUniqueLinkCode();

    try {
      const employee = await prisma.user.create({
        data: { ...fields, passwordHash, role: "EMPLOYEE", companyId: me.id, linkCode, active: true },
      });
      res.json({ employee: toPublicUser(employee) });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        badRequest("An account with this email already exists");
      }
      throw err;
    }
  })
);

companyRouter.patch(
  "/employees/:id",
  asyncHandler(async (req, res) => {
    const me = (req as AuthedRequest).user!;
    const existing = await requireOwnEmployee(me.id, req.params.id);
    const fields = employeeFields(req.body ?? {});
    const data: Prisma.UserUpdateInput = { ...fields };

    const password = optionalString(req.body?.password);
    if (password) {
      if (password.length < MIN_PASSWORD_LENGTH) {
        badRequest(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
      }
      data.passwordHash = await bcrypt.hash(password, 10);
    }

    try {
      const employee = await prisma.user.update({ where: { id: existing.id }, data });
      res.json({ employee: toPublicUser(employee) });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        badRequest("An account with this email already exists");
      }
      throw err;
    }
  })
);

companyRouter.post(
  "/employees/:id/deactivate",
  asyncHandler(async (req, res) => {
    const me = (req as AuthedRequest).user!;
    const existing = await requireOwnEmployee(me.id, req.params.id);
    await prisma.user.update({ where: { id: existing.id }, data: { active: false } });
    res.json({ ok: true });
  })
);

companyRouter.post(
  "/employees/:id/activate",
  asyncHandler(async (req, res) => {
    const me = (req as AuthedRequest).user!;
    const existing = await requireOwnEmployee(me.id, req.params.id);
    await prisma.user.update({ where: { id: existing.id }, data: { active: true } });
    res.json({ ok: true });
  })
);

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

companyRouter.get(
  "/analytics",
  asyncHandler(async (req, res) => {
    const me = (req as AuthedRequest).user!;

    const [employeeCounts, orders] = await Promise.all([
      prisma.user.groupBy({ by: ["active"], where: { companyId: me.id }, _count: { _all: true } }),
      prisma.groupOrder.findMany({
        where: { ownerId: me.id },
        select: {
          id: true,
          createdAt: true,
          canceledAt: true,
          subOrders: { select: { status: true, arrivedAt: true } },
        },
      }),
    ]);

    const employeeCount = employeeCounts.reduce((sum, row) => sum + row._count._all, 0);
    const activeEmployeeCount = employeeCounts.find((row) => row.active)?._count._all ?? 0;

    let active = 0;
    let completed = 0;
    let cancelled = 0;
    const completedDurationsDays: number[] = [];
    const monthly = new Map<string, { created: number; completed: number; cancelled: number }>();

    function bump(key: string, field: "created" | "completed" | "cancelled") {
      const entry = monthly.get(key) ?? { created: 0, completed: 0, cancelled: 0 };
      entry[field] += 1;
      monthly.set(key, entry);
    }

    for (const order of orders) {
      bump(monthKey(order.createdAt), "created");

      if (order.canceledAt) {
        cancelled += 1;
        bump(monthKey(order.canceledAt), "cancelled");
        continue;
      }

      if (isGroupOrderCompleted({ canceledAt: order.canceledAt, subOrders: order.subOrders })) {
        completed += 1;
        // The order finishes the moment its last sub-order closes.
        const completedAt = order.subOrders.reduce<Date | null>((max, sub) => {
          if (!sub.arrivedAt) return max;
          return !max || sub.arrivedAt > max ? sub.arrivedAt : max;
        }, null);
        if (completedAt) {
          bump(monthKey(completedAt), "completed");
          completedDurationsDays.push((completedAt.getTime() - order.createdAt.getTime()) / 86_400_000);
        }
      } else {
        active += 1;
      }
    }

    const avgDaysToComplete = completedDurationsDays.length
      ? completedDurationsDays.reduce((sum, days) => sum + days, 0) / completedDurationsDays.length
      : null;

    res.json({
      employeeCount,
      activeEmployeeCount,
      orders: { active, completed, cancelled, total: orders.length },
      avgDaysToComplete,
      monthly: [...monthly.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, counts]) => ({ month, ...counts })),
    });
  })
);
