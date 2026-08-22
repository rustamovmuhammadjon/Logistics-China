import { Router } from "express";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import type { UserRole } from "@prisma/client";
import { EMAIL_PATTERN, MIN_PASSWORD_LENGTH, isLettersOnly } from "@logistics/shared";
import { prisma } from "../lib/prisma.js";
import { badRequest } from "../lib/errors.js";
import { optionalString, requiredString } from "../lib/input.js";
import {
  checkAdminCredentials,
  createAdminSession,
  createUserSession,
  destroyAdminSession,
  destroyUserSession,
} from "../lib/auth.js";
import { asyncHandler } from "../middleware/errors.js";
import { currentUserPublic, type AuthedRequest } from "../middleware/auth.js";

const DUMMY_HASH = "$2a$10$QxidxGB1WlzKVEb2kIUyPO3Sv.8jD0yb3oB1.cxSoXeGzksG38nNa";

function generateCandidateCode() {
  return String(Math.floor(10000000 + Math.random() * 90000000));
}

async function generateUniqueLinkCode() {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateCandidateCode();
    const existing = await prisma.user.findUnique({ where: { linkCode: code } });
    if (!existing) return code;
  }
  throw new Error("Could not generate a unique link code, please try again");
}

export const authRouter = Router();

authRouter.get(
  "/me",
  asyncHandler(async (req, res) => {
    res.json(currentUserPublic(req));
  })
);

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const password = String(req.body?.password ?? "");
    const user = await prisma.user.findUnique({ where: { email } });
    const isValid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !isValid) badRequest("Invalid email or password");
    await createUserSession(res, user.id, user.email);
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
    const firstName = String(req.body?.firstName ?? "").trim();
    const lastName = String(req.body?.lastName ?? "").trim();
    const expectedCode = process.env.REGISTRATION_CODE ?? "";

    if (!expectedCode || inviteCode !== expectedCode) badRequest("Invalid invite code");
    if (roleRaw !== "CONSIGNEE" && roleRaw !== "OPERATOR") badRequest("Choose an account type");
    if (!firstName || !isLettersOnly(firstName)) {
      badRequest("First name is required and may only contain letters");
    }
    if (!lastName || !isLettersOnly(lastName)) {
      badRequest("Last name is required and may only contain letters");
    }
    if (!EMAIL_PATTERN.test(email)) badRequest("Enter a valid email address");
    if (password.length < MIN_PASSWORD_LENGTH) {
      badRequest(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
    }
    if (password !== confirmPassword) badRequest("Passwords do not match");

    const passwordHash = await bcrypt.hash(password, 10);
    const linkCode = await generateUniqueLinkCode();
    const role = roleRaw as UserRole;

    try {
      const user = await prisma.user.create({
        data: { email, passwordHash, role, linkCode, firstName, lastName },
      });
      await createUserSession(res, user.id, user.email);
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
