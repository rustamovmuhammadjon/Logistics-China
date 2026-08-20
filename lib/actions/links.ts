"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { requiredString } from "@/lib/form-utils";

export async function linkByCodeAction(
  _prevState: { error: string } | undefined,
  formData: FormData
): Promise<{ error: string } | undefined> {
  const me = await getCurrentUser();
  if (!me) return { error: "Not authorized" };

  const code = requiredString(formData, "code").trim();

  const other = await prisma.user.findUnique({ where: { linkCode: code } });
  if (!other) {
    return { error: "No account found with that ID" };
  }
  if (other.role === me.role) {
    return { error: `That ID belongs to another ${other.role.toLowerCase()} — you need the opposite type` };
  }

  const consigneeId = me.role === "CONSIGNEE" ? me.id : other.id;
  const operatorId = me.role === "OPERATOR" ? me.id : other.id;

  try {
    await prisma.operatorLink.create({ data: { consigneeId, operatorId } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { error: "Already linked with that account" };
    }
    throw err;
  }

  revalidatePath("/dashboard");
}

export async function unlinkAction(linkId: string) {
  const me = await getCurrentUser();
  if (!me) throw new Error("Not authorized");

  const link = await prisma.operatorLink.findUniqueOrThrow({ where: { id: linkId } });
  if (link.consigneeId !== me.id && link.operatorId !== me.id) {
    throw new Error("Not authorized");
  }

  await prisma.operatorLink.delete({ where: { id: linkId } });
  revalidatePath("/dashboard");
}
