import type { NextFunction, Request, Response } from "express";
import type { User } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { unauthorized } from "../lib/errors.js";
import {
  readCookies,
  toPublicUser,
  verifyAdminSessionFromToken,
  verifyUserSessionFromToken,
} from "../lib/auth.js";

export type AuthedRequest = Request & {
  isAdmin: boolean;
  user: User | null;
};

export async function attachSession(req: Request, _res: Response, next: NextFunction) {
  const scoped = req as AuthedRequest;
  const { adminToken, userToken } = readCookies(req);
  scoped.isAdmin = await verifyAdminSessionFromToken(adminToken);
  const session = await verifyUserSessionFromToken(userToken);
  scoped.user = session
    ? await prisma.user.findUnique({ where: { id: session.userId } })
    : null;
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

export function requireConsignee(req: Request, _res: Response, next: NextFunction) {
  const user = (req as AuthedRequest).user;
  if (!user || user.role !== "CONSIGNEE") unauthorized();
  next();
}

export function requireOperator(req: Request, _res: Response, next: NextFunction) {
  const user = (req as AuthedRequest).user;
  if (!user || user.role !== "OPERATOR") unauthorized();
  next();
}

export function requireRegisteredUser(req: Request, _res: Response, next: NextFunction) {
  if (!(req as AuthedRequest).user) unauthorized();
  next();
}

export async function assertOperatorLinked(operatorId: string, ownerId: string | null) {
  if (!ownerId) unauthorized();
  const link = await prisma.operatorLink.findUnique({
    where: { consigneeId_operatorId: { consigneeId: ownerId, operatorId } },
  });
  if (!link) unauthorized();
}

export function currentUserPublic(req: Request) {
  const { isAdmin, user } = req as AuthedRequest;
  return { admin: isAdmin, user: user ? toPublicUser(user) : null };
}
