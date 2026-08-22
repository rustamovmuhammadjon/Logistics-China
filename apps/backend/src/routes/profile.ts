import { Router } from "express";
import { Prisma } from "@prisma/client";
import { EMAIL_PATTERN, isLettersOnly } from "@logistics/shared";
import { prisma } from "../lib/prisma.js";
import { badRequest } from "../lib/errors.js";
import { optionalString, parseDateOfBirth } from "../lib/input.js";
import { toPublicUser } from "../lib/auth.js";
import { assertSupabasePublicUrl } from "../lib/supabase.js";
import { asyncHandler } from "../middleware/errors.js";
import { requireRegisteredUser, type AuthedRequest } from "../middleware/auth.js";

export const profileRouter = Router();

profileRouter.use(requireRegisteredUser);

profileRouter.patch(
  "/",
  asyncHandler(async (req, res) => {
    const me = (req as AuthedRequest).user!;
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const firstName = String(req.body?.firstName ?? "").trim();
    const lastName = String(req.body?.lastName ?? "").trim();

    if (!EMAIL_PATTERN.test(email)) badRequest("Enter a valid email address");
    if (!firstName || !isLettersOnly(firstName)) {
      badRequest("First name is required and may only contain letters");
    }
    if (!lastName || !isLettersOnly(lastName)) {
      badRequest("Last name is required and may only contain letters");
    }

    try {
      const user = await prisma.user.update({
        where: { id: me.id },
        data: {
          email,
          firstName,
          lastName,
          phone: optionalString(req.body?.phone),
          dateOfBirth: parseDateOfBirth(req.body?.dateOfBirth, true),
        },
      });
      res.json({ user: toPublicUser(user) });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        badRequest("An account with this email already exists");
      }
      throw err;
    }
  })
);

profileRouter.post(
  "/photo",
  asyncHandler(async (req, res) => {
    const me = (req as AuthedRequest).user!;
    const url = String(req.body?.url ?? "");
    assertSupabasePublicUrl(url);
    const user = await prisma.user.update({
      where: { id: me.id },
      data: { photoUrl: url },
    });
    res.json({ user: toPublicUser(user) });
  })
);
