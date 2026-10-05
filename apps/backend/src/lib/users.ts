import { prisma } from "./prisma.js";
import { notFound } from "./errors.js";
import { removePublicFiles } from "./supabase.js";
import { removeDocumentFiles } from "./documents.js";

export async function deleteUserAndRelatedData(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      ownedOrders: {
        include: {
          subOrders: {
            include: {
              trucks: { include: { media: true, documents: true } },
            },
          },
        },
      },
    },
  });
  if (!user) notFound();

  const trucks = user.ownedOrders.flatMap((order) => order.subOrders.flatMap((sub) => sub.trucks));
  await removePublicFiles([user.photoUrl, ...trucks.flatMap((truck) => truck.media.map((item) => item.url))]);
  await removeDocumentFiles(trucks.flatMap((truck) => truck.documents.map((doc) => doc.storagePath)));

  await prisma.$transaction(async (tx) => {
    await tx.groupOrder.deleteMany({ where: { ownerId: userId } });
    await tx.user.delete({ where: { id: userId } });
  });
}
