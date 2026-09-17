import type { NextFunction, Request, Response } from "express";
import type { User } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { unauthorized } from "../lib/errors.js";
import {
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

export async function attachSession(req: Request, _res: Response, next: NextFunction) {
  const scoped = req as AuthedRequest;
  const { adminToken, userToken } = readCookies(req);
  scoped.isAdmin = await verifyAdminSessionFromToken(adminToken);
  const session = await verifyUserSessionFromToken(userToken);
  const user = session ? await prisma.user.findUnique({ where: { id: session.userId } }) : null;
  // A deactivated employee's existing session stops working immediately,
  // not just on their next login attempt.
  scoped.user = user && !user.active ? null : user;
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

export function requireCompany(req: Request, _res: Response, next: NextFunction) {
  const user = (req as AuthedRequest).user;
  if (!user || user.role !== "COMPANY") unauthorized();
  next();
}

// Individual entrepreneurs (role CONSIGNEE), companies, and a company's
// employees all manage orders through the same routes — an employee's
// orders are owned by their company, a company's by itself.
export function requireOrderCreator(req: Request, _res: Response, next: NextFunction) {
  const user = (req as AuthedRequest).user;
  if (!user || (user.role !== "CONSIGNEE" && user.role !== "COMPANY" && user.role !== "EMPLOYEE")) unauthorized();
  next();
}

export function requireRegisteredUser(req: Request, _res: Response, next: NextFunction) {
  if (!(req as AuthedRequest).user) unauthorized();
  next();
}

export async function assertOperatorLinked(operatorId: string, ownerId: string | null, orderId?: string) {
  if (!ownerId) unauthorized();
  const link = await prisma.operatorLink.findUnique({
    where: { consigneeId_operatorId: { consigneeId: ownerId, operatorId } },
  });
  if (!link) unauthorized();
  if (link.scope === "SELECTED") {
    if (!orderId) unauthorized();
    const grant = await prisma.operatorOrderGrant.findUnique({
      where: { operatorLinkId_groupOrderId: { operatorLinkId: link.id, groupOrderId: orderId } },
    });
    if (!grant) unauthorized();
  }
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
