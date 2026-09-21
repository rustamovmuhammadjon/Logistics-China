import { Router } from "express";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { EMAIL_PATTERN, MIN_PASSWORD_LENGTH, isLettersOnly } from "@logistics/shared";
import { prisma } from "../lib/prisma.js";
import { badRequest } from "../lib/errors.js";
import { optionalString, parseDateOfBirth } from "../lib/input.js";
import { toPublicUser } from "../lib/auth.js";
import { assertSupabasePublicUrl, removePublicFiles } from "../lib/supabase.js";
import { asyncHandler } from "../middleware/errors.js";
import { requireRegisteredUser, type AuthedRequest } from "../middleware/auth.js";

export const profileRouter = Router();

profileRouter.use(requireRegisteredUser);

// An employee's (or a company-employed operator's) profile is managed by
// their company, not themselves — mirrors the employee-creation form.
function isManagedByCompany(me: { role: string; companyId: string | null }) {
  return me.role === "EMPLOYEE" || (me.role === "OPERATOR" && !!me.companyId);
}

profileRouter.patch(
  "/",
  asyncHandler(async (req, res) => {
    const me = (req as AuthedRequest).user!;
    if (isManagedByCompany(me)) badRequest("Your company manages your profile — ask them to make changes.");
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    if (!EMAIL_PATTERN.test(email)) badRequest("Enter a valid email address");

    // Both company types have a company name instead of a person's name/date of birth.
    const data =
      me.role === "COMPANY" || me.role === "OPERATOR_COMPANY"
        ? (() => {
            const companyName = String(req.body?.companyName ?? "").trim();
            if (!companyName) badRequest("Company name is required");
            return { email, companyName, phone: optionalString(req.body?.phone) };
          })()
        : (() => {
            const firstName = String(req.body?.firstName ?? "").trim();
            const lastName = String(req.body?.lastName ?? "").trim();
            if (!firstName || !isLettersOnly(firstName)) {
              badRequest("First name is required and may only contain letters");
            }
            if (!lastName || !isLettersOnly(lastName)) {
              badRequest("Last name is required and may only contain letters");
            }
            return {
              email,
              firstName,
              lastName,
              phone: optionalString(req.body?.phone),
              dateOfBirth: parseDateOfBirth(req.body?.dateOfBirth, true),
            };
          })();

    try {
      const user = await prisma.user.update({ where: { id: me.id }, data });
      res.json({ user: toPublicUser(user) });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        badRequest("An account with this email already exists");
      }
      throw err;
    }
  })
);

// Password self-service is never gated by isManagedByCompany — a company
// only ever sets an employee's/operator's INITIAL password at creation and
// can't see or change it afterward (no password field on the edit forms);
// from then on, only the account owner can change it, and only here.
profileRouter.post(
  "/password",
  asyncHandler(async (req, res) => {
    const me = (req as AuthedRequest).user!;
    const currentPassword = String(req.body?.currentPassword ?? "");
    const newPassword = String(req.body?.newPassword ?? "");
    const confirmNewPassword = String(req.body?.confirmNewPassword ?? "");

    const isValid = await bcrypt.compare(currentPassword, me.passwordHash);
    if (!isValid) badRequest("Current password is incorrect");
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      badRequest(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
    }
    if (newPassword !== confirmNewPassword) badRequest("New passwords do not match");

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: me.id }, data: { passwordHash } });
    res.json({ ok: true });
  })
);

// Profile photo is self-service for everyone, including an employee or a
// company-employed operator — unlike the rest of the profile, a company
// never sets or controls a user's photo, at creation or afterward.
profileRouter.post(
  "/photo",
  asyncHandler(async (req, res) => {
    const me = (req as AuthedRequest).user!;
    const url = String(req.body?.url ?? "");
    assertSupabasePublicUrl(url);
    const previousPhotoUrl = me.photoUrl;
    const user = await prisma.user.update({
      where: { id: me.id },
      data: { photoUrl: url },
    });
    // Replace, don't accumulate — an old avatar left behind just wastes
    // storage since nothing links to it anymore.
    if (previousPhotoUrl && previousPhotoUrl !== url) {
      await removePublicFiles([previousPhotoUrl]);
    }
    res.json({ user: toPublicUser(user) });
  })
);
