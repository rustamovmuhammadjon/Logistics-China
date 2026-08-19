import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const ADMIN_COOKIE_NAME = "logistics_admin_session";
const USER_COOKIE_NAME = "logistics_user_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30; // 30 days

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET environment variable is not set");
  }
  return new TextEncoder().encode(secret);
}

async function sign(payload: Record<string, unknown>) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSecretKey());
}

// --- Admin session (single account, env-var credentials) ---------------

export function checkAdminCredentials(username: string, password: string) {
  const expectedUsername = process.env.ADMIN_USERNAME ?? "admin";
  const expectedPassword = process.env.ADMIN_PASSWORD ?? "";
  return username === expectedUsername && password === expectedPassword && password.length > 0;
}

export async function createAdminSession() {
  const token = await sign({ role: "admin" });
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export async function destroyAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE_NAME);
}

export async function isAdminAuthenticated() {
  const cookieStore = await cookies();
  return verifyAdminSessionFromToken(cookieStore.get(ADMIN_COOKIE_NAME)?.value);
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

/**
 * Server Actions are callable as their own network endpoints, addressable by
 * an id that can be reproduced by anyone who has the source (this repo is
 * public), independently of which page renders them. The route middleware
 * only gates requests under /admin/*, so every mutating action must also
 * check auth for itself rather than relying solely on the page it happens
 * to be rendered from.
 */
export async function requireAdmin() {
  const authed = await isAdminAuthenticated();
  if (!authed) {
    throw new Error("Not authorized");
  }
}

// --- Registered viewer session (read-only monitoring access) -----------

type ViewerSessionPayload = { role: "viewer"; userId: string; email: string };

export async function createUserSession(userId: string, email: string) {
  const token = await sign({ role: "viewer", userId, email } satisfies ViewerSessionPayload);
  const cookieStore = await cookies();
  cookieStore.set(USER_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export async function destroyUserSession() {
  const cookieStore = await cookies();
  cookieStore.delete(USER_COOKIE_NAME);
}

export async function verifyUserSessionFromToken(token: string | undefined) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (payload.role !== "viewer") return null;
    return payload as unknown as ViewerSessionPayload;
  } catch {
    return null;
  }
}

/** Returns the logged-in viewer's session, or null. Does not consider admin sessions. */
export async function getViewerSession() {
  const cookieStore = await cookies();
  return verifyUserSessionFromToken(cookieStore.get(USER_COOKIE_NAME)?.value);
}

/**
 * The monitoring pages ("/" and "/track/*") are readable by either a
 * registered viewer or the admin (checked in middleware). This helper is for
 * the pages themselves to show who's currently looking at it / a log-out link.
 */
export async function getCurrentViewerLabel() {
  const viewer = await getViewerSession();
  if (viewer) return viewer.email;
  if (await isAdminAuthenticated()) return "admin";
  return null;
}

export { ADMIN_COOKIE_NAME, USER_COOKIE_NAME };
