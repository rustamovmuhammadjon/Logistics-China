import { jwtVerify } from "jose";

export const ADMIN_COOKIE_NAME = "logistics_admin_session";
export const USER_COOKIE_NAME = "logistics_user_session";

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET environment variable is not set");
  return new TextEncoder().encode(secret);
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

export async function verifyUserSessionFromToken(token: string | undefined) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (payload.role !== "viewer") return null;
    return payload as { role: "viewer"; userId: string; email: string };
  } catch {
    return null;
  }
}
