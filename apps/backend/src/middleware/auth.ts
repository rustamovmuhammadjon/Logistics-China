import type { NextFunction, Request, Response } from "express";
import type { User } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { unauthorized } from "../lib/errors.js";
import {
  createUserSession,
  readBearerToken,
  readCookies,
  toPublicUser,
  verifyAdminSessionFromToken,
  verifyDriverToken,
  verifyUserSessionFromToken,
  type DriverSession,
} from "../lib/auth.js";

export type AuthedRequest = Request & {
  isAdmin: boolean;
  user: User | null;
};

export type DriverRequest = Request & {
  driver: DriverSession;
};

export async function attachSession(req: Request, res: Response, next: NextFunction) {
  const scoped = req as AuthedRequest;
  const { adminToken, userToken } = readCookies(req);
  scoped.isAdmin = await verifyAdminSessionFromToken(adminToken);
  const session = await verifyUserSessionFromToken(userToken);
  const user = session ? await prisma.user.findUnique({ where: { id: session.userId } }) : null;
  // A deactivated employee's existing session stops working immediately,
  // not just on their next login attempt.
  scoped.user = user && !user.active ? null : user;
  // "Remember me" sessions slide: every active request within the 7-day
  // window reissues the cookie for another 7 days, so a user who returns
  // at least once every 7 days is never forced to log in again, while 7
  // days of inactivity lets it expire naturally.
  if (scoped.user && session?.remember) {
    await createUserSession(res, scoped.user.id, scoped.user.email, true);
  }
  next();
}

export function requireAnyAuth(req: Request, _res: Response, next: NextFunction) {
  const { isAdmin, user } = req as AuthedRequest;
  if (!isAdmin && !user) unauthorized();
  next();
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!(req as AuthedRequest).isAdmin) unauthorized();
  next();
}

export function requireOperator(req: Request, _res: Response, next: NextFunction) {
  const user = (req as AuthedRequest).user;
  if (!user || user.role !== "OPERATOR") unauthorized();
  next();
}

// "Company for orders" — never confuse with requireOperatorCompany below.
export function requireCompany(req: Request, _res: Response, next: NextFunction) {
  const user = (req as AuthedRequest).user;
  if (!user || user.role !== "COMPANY") unauthorized();
  next();
}

// "Company for tracking" — a completely separate account type from COMPANY
// above. It manages OPERATOR employees (see operatorCompany.ts), never
// orders themselves.
export function requireOperatorCompany(req: Request, _res: Response, next: NextFunction) {
  const user = (req as AuthedRequest).user;
  if (!user || user.role !== "OPERATOR_COMPANY") unauthorized();
  next();
}

// Read baseline: individual entrepreneurs (role CONSIGNEE), companies, and
// a company's employees can all VIEW orders through the same routes — an
// employee's orders are owned by their company, a company's by itself.
export function requireOrderCreator(req: Request, _res: Response, next: NextFunction) {
  const user = (req as AuthedRequest).user;
  if (!user || (user.role !== "CONSIGNEE" && user.role !== "COMPANY" && user.role !== "EMPLOYEE")) unauthorized();
  next();
}

// Write access is narrower than read access: a company can never create,
// edit, cancel, or complete an order itself — only an individual
// entrepreneur or one of a company's employees can.
export function requireOrderWriter(req: Request, _res: Response, next: NextFunction) {
  const user = (req as AuthedRequest).user;
  if (!user || (user.role !== "CONSIGNEE" && user.role !== "EMPLOYEE")) unauthorized();
  next();
}

export function requireRegisteredUser(req: Request, _res: Response, next: NextFunction) {
  if (!(req as AuthedRequest).user) unauthorized();
  next();
}

export async function assertOperatorLinked(
  operatorId: string,
  order: { ownerId: string | null; createdByUserId: string | null },
  orderId?: string
) {
  // A link belongs to whoever manages it: the order's owner (an individual
  // entrepreneur, or a company's own account), or — for a company-owned
  // order — the specific employee who created it, since each employee
  // links their own operators rather than sharing the company's links.
  const candidateIds = [order.ownerId, order.createdByUserId].filter(
    (id): id is string => typeof id === "string"
  );
  if (candidateIds.length === 0) unauthorized();
  const links = await prisma.operatorLink.findMany({
    where: { operatorId, consigneeId: { in: candidateIds } },
  });
  if (links.length === 0) unauthorized();
  if (links.some((link) => link.scope === "ALL")) return;
  if (!orderId) unauthorized();
  const grant = await prisma.operatorOrderGrant.findFirst({
    where: { operatorLinkId: { in: links.map((link) => link.id) }, groupOrderId: orderId },
  });
  if (!grant) unauthorized();
}

export function currentUserPublic(req: Request) {
  const { isAdmin, user } = req as AuthedRequest;
  return { admin: isAdmin, user: user ? toPublicUser(user) : null };
}

export async function requireDriver(req: Request, _res: Response, next: NextFunction) {
  const session = await verifyDriverToken(readBearerToken(req));
  if (!session) unauthorized();
  (req as DriverRequest).driver = session;
  next();
}
