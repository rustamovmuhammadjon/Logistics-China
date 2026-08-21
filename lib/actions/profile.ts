"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { optionalString } from "@/lib/form-utils";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BLOB_HOST_PATTERN = /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//i;

export async function updateProfileAction(
  _prevState: { error: string } | undefined,
  formData: FormData
): Promise<{ error: string } | undefined> {
  const me = await getCurrentUser();
  if (!me) return { error: "Not authorized" };

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!EMAIL_PATTERN.test(email)) {
    return { error: "Enter a valid email address" };
  }

  try {
    await prisma.user.update({
      where: { id: me.id },
      data: {
        email,
        firstName: optionalString(formData, "firstName"),
        lastName: optionalString(formData, "lastName"),
        phone: optionalString(formData, "phone"),
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { error: "An account with this email already exists" };
    }
    throw err;
  }

  revalidatePath("/profile");
  revalidatePath("/");
}

export async function updateProfilePhotoAction(url: string) {
  const me = await getCurrentUser();
  if (!me) throw new Error("Not authorized");

  if (!BLOB_HOST_PATTERN.test(url)) {
    throw new Error("Invalid photo URL");
  }

  await prisma.user.update({ where: { id: me.id }, data: { photoUrl: url } });
  revalidatePath("/profile");
  revalidatePath("/");
}
