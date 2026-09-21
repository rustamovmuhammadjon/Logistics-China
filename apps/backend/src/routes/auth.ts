import { Router } from "express";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import type { UserRole } from "@prisma/client";
import { EMAIL_PATTERN, MIN_PASSWORD_LENGTH } from "@logistics/shared";
import { prisma } from "../lib/prisma.js";
import { badRequest } from "../lib/errors.js";
import { optionalString, requiredString, truthyFlag } from "../lib/input.js";
import {
  checkAdminCredentials,
  createAdminSession,
  createUserSession,
  destroyAdminSession,
  destroyUserSession,
  generateUniqueLinkCode,
} from "../lib/auth.js";
import { asyncHandler } from "../middleware/errors.js";
import { currentUserPublic, type AuthedRequest } from "../middleware/auth.js";

const DUMMY_HASH = "$2a$10$QxidxGB1WlzKVEb2kIUyPO3Sv.8jD0yb3oB1.cxSoXeGzksG38nNa";

export const authRouter = Router();

authRouter.get(
  "/me",
  asyncHandler(async (req, res) => {
    const me = currentUserPublic(req);
    // An employee (or a company-employed operator) doesn't otherwise have
    // any way to see who they work for — surface the parent company's
    // basic info alongside their own profile.
    if ((me.user?.role === "EMPLOYEE" || me.user?.role === "OPERATOR") && me.user.companyId) {
      const company = await prisma.user.findUnique({
        where: { id: me.user.companyId },
        select: { companyName: true, email: true, phone: true },
      });
      res.json({ ...me, company });
      return;
    }
    res.json(me);
  })
);

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const password = String(req.body?.password ?? "");
    const remember = truthyFlag(req.body?.remember);
    const user = await prisma.user.findUnique({ where: { email } });
    const isValid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !isValid) badRequest("Invalid email or password");
    if (!user.active) badRequest("This account has been deactivated. Contact your company.");
    await createUserSession(res, user.id, user.email, remember);
    res.json({ ok: true });
  })
);

authRouter.post(
  "/register",
  asyncHandler(async (req, res) => {
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const password = String(req.body?.password ?? "");
    const confirmPassword = String(req.body?.confirmPassword ?? "");
    const inviteCode = String(req.body?.inviteCode ?? "");
    const roleRaw = String(req.body?.role ?? "");
    const expectedCode = process.env.REGISTRATION_CODE ?? "";

    if (!expectedCode || inviteCode !== expectedCode) badRequest("Invalid invite code");
    // Self-registration only ever creates a company-shaped account now — an
    // individual entrepreneur (CONSIGNEE) or a standalone OPERATOR can no
    // longer sign up directly. "Company" (COMPANY) is for placing orders;
    // "Tracking company" (OPERATOR_COMPANY) is for tracking them — each
    // then adds its own employees. Never confuse the two.
    if (roleRaw !== "COMPANY" && roleRaw !== "OPERATOR_COMPANY") {
      badRequest("Choose an account type");
    }
    const role = roleRaw as UserRole;

    const companyName = String(req.body?.companyName ?? "").trim();
    if (!companyName) badRequest("Company name is required");

    if (!EMAIL_PATTERN.test(email)) badRequest("Enter a valid email address");
    if (password.length < MIN_PASSWORD_LENGTH) {
      badRequest(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
    }
    if (password !== confirmPassword) badRequest("Passwords do not match");

    const passwordHash = await bcrypt.hash(password, 10);
    const linkCode = await generateUniqueLinkCode();

    try {
      const user = await prisma.user.create({
        data: { email, passwordHash, role, linkCode, companyName },
      });
      // No "remember me" checkbox at registration — natural to stay signed
      // in for the usual sliding 7-day window right after creating an
      // account, same as if they'd checked it on the login page.
      await createUserSession(res, user.id, user.email, true);
      res.json({ ok: true });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        badRequest("An account with this email already exists");
      }
      throw err;
    }
  })
);

authRouter.post(
  "/logout",
  asyncHandler(async (_req, res) => {
    destroyUserSession(res);
    res.json({ ok: true });
  })
);

authRouter.post(
  "/reset-password",
  asyncHandler(async (req, res) => {
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const inviteCode = String(req.body?.inviteCode ?? "");
    const password = String(req.body?.password ?? "");
    const confirmPassword = String(req.body?.confirmPassword ?? "");
    const expectedCode = process.env.REGISTRATION_CODE ?? "";

    if (!expectedCode || inviteCode !== expectedCode) badRequest("Invalid registration code");
    if (!EMAIL_PATTERN.test(email)) badRequest("Enter a valid email address");
    if (password.length < MIN_PASSWORD_LENGTH) {
      badRequest(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
    }
    if (password !== confirmPassword) badRequest("Passwords do not match");

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) badRequest("No account found with that email");

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await bcrypt.hash(password, 10) },
    });
    res.json({ ok: true });
  })
);

authRouter.post(
  "/admin/login",
  asyncHandler(async (req, res) => {
    const username = requiredString(req.body?.username, "username");
    const password = optionalString(req.body?.password) ?? "";
    if (!checkAdminCredentials(username, password)) badRequest("Invalid username or password");
    await createAdminSession(res);
    res.json({ ok: true });
  })
);

authRouter.post(
  "/admin/logout",
  asyncHandler(async (_req, res) => {
    destroyAdminSession(res);
    res.json({ ok: true });
  })
);

export function currentAuthed(req: AuthedRequest) {
  return req;
}
