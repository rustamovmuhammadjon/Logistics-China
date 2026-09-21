import { SignJWT, jwtVerify } from "jose";
import type { Request, Response } from "express";
import type { User } from "@prisma/client";
import { prisma } from "./prisma.js";

export const ADMIN_COOKIE_NAME = "logistics_admin_session";
export const USER_COOKIE_NAME = "logistics_user_session";
const ADMIN_SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30;
// "Remember me" checked: a sliding 7-day session — attachSession reissues
// this cookie on every authenticated request, so an active user (visits at
// least once every 7 days) is never signed out, but 7 days of inactivity
// expires it. "Remember me" unchecked: a same-browser-session cookie (no
// maxAge, so the browser drops it on close) with a short 1-day token
// lifetime as a safety net in case the browser keeps it around anyway.
const REMEMBER_SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7;
const DEFAULT_SESSION_DURATION_SECONDS = 60 * 60 * 24;

function generateCandidateLinkCode() {
  return String(Math.floor(10000000 + Math.random() * 90000000));
}

export async function generateUniqueLinkCode() {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateCandidateLinkCode();
    const existing = await prisma.user.findUnique({ where: { linkCode: code } });
    if (!existing) return code;
  }
  throw new Error("Could not generate a unique link code, please try again");
}

export type ViewerSession = { role: "viewer"; userId: string; email: string; remember: boolean };
export type DriverSession = { role: "driver"; assignmentId: string; truckId: string; tokenVersion: number };

const DRIVER_TOKEN_DURATION_SECONDS = 60 * 60 * 24 * 180;

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET environment variable is not set");
  return new TextEncoder().encode(secret);
}

async function sign(payload: Record<string, unknown>, durationSeconds: number) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${durationSeconds}s`)
    .sign(getSecretKey());
}

// Omit maxAgeSeconds for a browser-session cookie (cleared when the
// browser closes) — used for a non-"remember me" login.
function cookieOptions(maxAgeSeconds?: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    ...(maxAgeSeconds !== undefined ? { maxAge: maxAgeSeconds * 1000 } : {}),
  };
}

export function checkAdminCredentials(username: string, password: string) {
  const expectedUsername = process.env.ADMIN_USERNAME ?? "admin";
  const expectedPassword = process.env.ADMIN_PASSWORD ?? "";
  return username === expectedUsername && password === expectedPassword && password.length > 0;
}

export async function createAdminSession(res: Response) {
  const token = await sign({ role: "admin" }, ADMIN_SESSION_DURATION_SECONDS);
  res.cookie(ADMIN_COOKIE_NAME, token, cookieOptions(ADMIN_SESSION_DURATION_SECONDS));
}

export async function createUserSession(res: Response, userId: string, email: string, remember: boolean) {
  const duration = remember ? REMEMBER_SESSION_DURATION_SECONDS : DEFAULT_SESSION_DURATION_SECONDS;
  const token = await sign({ role: "viewer", userId, email, remember }, duration);
  res.cookie(USER_COOKIE_NAME, token, cookieOptions(remember ? duration : undefined));
}

export function destroyAdminSession(res: Response) {
  res.clearCookie(ADMIN_COOKIE_NAME, { path: "/" });
}

export function destroyUserSession(res: Response) {
  res.clearCookie(USER_COOKIE_NAME, { path: "/" });
}

export async function verifyAdminSessionFromToken(token: string | undefined) {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload.role === "admin";
  } catch {
    return false;
  }
}

export async function verifyUserSessionFromToken(token: string | undefined): Promise<ViewerSession | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (payload.role !== "viewer") return null;
    return payload as unknown as ViewerSession;
  } catch {
    return null;
  }
}

export function toPublicUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    companyName: user.companyName,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    photoUrl: user.photoUrl,
    linkCode: user.linkCode,
    dateOfBirth: user.dateOfBirth ? user.dateOfBirth.toISOString() : null,
    active: user.active,
    companyId: user.companyId,
  };
}

export function readCookies(req: Request) {
  return {
    adminToken: req.cookies?.[ADMIN_COOKIE_NAME] as string | undefined,
    userToken: req.cookies?.[USER_COOKIE_NAME] as string | undefined,
  };
}

export function readBearerToken(req: Request) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return undefined;
  const token = header.slice(7).trim();
  return token.length > 0 ? token : undefined;
}

export async function signDriverToken(input: Omit<DriverSession, "role">) {
  return new SignJWT({ role: "driver", ...input })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${DRIVER_TOKEN_DURATION_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifyDriverToken(token: string | undefined): Promise<DriverSession | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (payload.role !== "driver" || typeof payload.assignmentId !== "string") return null;
    if (typeof payload.truckId !== "string" || typeof payload.tokenVersion !== "number") return null;
    return payload as unknown as DriverSession;
  } catch {
    return null;
  }
}
