"use server";

import { revalidatePath } from "next/cache";
import { del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import type { MediaType } from "@prisma/client";

const BLOB_HOST_PATTERN = /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//i;

export async function createMediaAction(
  groupOrderId: string,
  subOrderId: string,
  truckId: string,
  data: { url: string; type: MediaType; fileName?: string }
) {
  await requireAdmin();

  if (!BLOB_HOST_PATTERN.test(data.url)) {
    throw new Error("Invalid media URL");
  }

  await prisma.media.create({
    data: {
      truckId,
      url: data.url,
      type: data.type,
      fileName: data.fileName ?? null,
    },
  });

  revalidatePath(`/admin/orders/${groupOrderId}/suborders/${subOrderId}/trucks/${truckId}`);
}

export async function deleteMediaAction(
  groupOrderId: string,
  subOrderId: string,
  truckId: string,
  mediaId: string
) {
  await requireAdmin();

  const media = await prisma.media.findUniqueOrThrow({ where: { id: mediaId } });
  await prisma.media.delete({ where: { id: mediaId } });

  try {
    await del(media.url);
  } catch {
    // ignore blob deletion errors (e.g. token missing locally, or already removed)
  }

  revalidatePath(`/admin/orders/${groupOrderId}/suborders/${subOrderId}/trucks/${truckId}`);
}
