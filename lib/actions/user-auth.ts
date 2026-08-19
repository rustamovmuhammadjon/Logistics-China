"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createUserSession, destroyUserSession } from "@/lib/auth";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
// A valid-format bcrypt hash with no real matching password. Used so
// bcrypt.compare always runs the same expensive check even when the email
// isn't registered — otherwise a fast/slow response difference would let
// someone probe which emails have accounts (timing-based enumeration).
const DUMMY_HASH = "$2a$10$QxidxGB1WlzKVEb2kIUyPO3Sv.8jD0yb3oB1.cxSoXeGzksG38nNa";

function safeNextPath(next: unknown): string {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//")) {
    return "/";
  }
  return next;
}

export async function registerUserAction(
  _prevState: { error: string } | undefined,
  formData: FormData
): Promise<{ error: string } | undefined> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const inviteCode = String(formData.get("inviteCode") ?? "");
  const next = safeNextPath(formData.get("next"));

  const expectedCode = process.env.REGISTRATION_CODE ?? "";

  if (!expectedCode || inviteCode !== expectedCode) {
    return { error: "Invalid invite code" };
  }
  if (!EMAIL_PATTERN.test(email)) {
    return { error: "Enter a valid email address" };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` };
  }
  if (password !== confirmPassword) {
    return { error: "Passwords do not match" };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  let userId: string;
  try {
    const user = await prisma.user.create({ data: { email, passwordHash } });
    userId = user.id;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { error: "An account with this email already exists" };
    }
    throw err;
  }

  await createUserSession(userId, email);
  redirect(next);
}

export async function loginUserAction(
  _prevState: { error: string } | undefined,
  formData: FormData
): Promise<{ error: string } | undefined> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = safeNextPath(formData.get("next"));

  const user = await prisma.user.findUnique({ where: { email } });
  const isValid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);

  if (!user || !isValid) {
    return { error: "Invalid email or password" };
  }

  await createUserSession(user.id, user.email);
  redirect(next);
}

export async function logoutUserAction() {
  await destroyUserSession();
  redirect("/login");
}
