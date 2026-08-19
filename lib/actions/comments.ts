"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { optionalString, requiredString } from "@/lib/form-utils";

type CommentTarget =
  | { level: "group"; groupOrderId: string }
  | { level: "sub"; groupOrderId: string; subOrderId: string }
  | { level: "truck"; groupOrderId: string; subOrderId: string; truckId: string };

function revalidateForTarget(target: CommentTarget) {
  if (target.level === "group") {
    revalidatePath(`/admin/orders/${target.groupOrderId}`);
  } else if (target.level === "sub") {
    revalidatePath(`/admin/orders/${target.groupOrderId}/suborders/${target.subOrderId}`);
  } else {
    revalidatePath(
      `/admin/orders/${target.groupOrderId}/suborders/${target.subOrderId}/trucks/${target.truckId}`
    );
  }
}

export async function addCommentAction(target: CommentTarget, formData: FormData) {
  await requireAdmin();
  const text = requiredString(formData, "text");
  const author = optionalString(formData, "author");

  await prisma.comment.create({
    data: {
      text,
      author,
      groupOrderId: target.level === "group" ? target.groupOrderId : undefined,
      subOrderId: target.level === "sub" ? target.subOrderId : undefined,
      truckId: target.level === "truck" ? target.truckId : undefined,
    },
  });

  revalidateForTarget(target);
}

export async function deleteCommentAction(target: CommentTarget, commentId: string) {
  await requireAdmin();
  await prisma.comment.delete({ where: { id: commentId } });
  revalidateForTarget(target);
}
