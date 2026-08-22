import { SignJWT, jwtVerify } from "jose";
import type { Request, Response } from "express";
import type { User } from "@prisma/client";

export const ADMIN_COOKIE_NAME = "logistics_admin_session";
export const USER_COOKIE_NAME = "logistics_user_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30;

export type ViewerSession = { role: "viewer"; userId: string; email: string };

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET environment variable is not set");
  return new TextEncoder().encode(secret);
}

async function sign(payload: Record<string, unknown>) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSecretKey());
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_DURATION_SECONDS * 1000,
  };
}

export function checkAdminCredentials(username: string, password: string) {
  const expectedUsername = process.env.ADMIN_USERNAME ?? "admin";
  const expectedPassword = process.env.ADMIN_PASSWORD ?? "";
  return username === expectedUsername && password === expectedPassword && password.length > 0;
}

export async function createAdminSession(res: Response) {
  const token = await sign({ role: "admin" });
  res.cookie(ADMIN_COOKIE_NAME, token, cookieOptions());
}

export async function createUserSession(res: Response, userId: string, email: string) {
  const token = await sign({ role: "viewer", userId, email });
  res.cookie(USER_COOKIE_NAME, token, cookieOptions());
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
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    photoUrl: user.photoUrl,
    linkCode: user.linkCode,
  };
}

export function readCookies(req: Request) {
  return {
    adminToken: req.cookies?.[ADMIN_COOKIE_NAME] as string | undefined,
    userToken: req.cookies?.[USER_COOKIE_NAME] as string | undefined,
  };
}
