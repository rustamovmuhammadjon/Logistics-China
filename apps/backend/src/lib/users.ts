import { prisma } from "./prisma.js";
import { notFound } from "./errors.js";
import { removePublicFiles } from "./supabase.js";

export async function deleteUserAndRelatedData(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      ownedOrders: {
        include: {
          subOrders: {
            include: {
              trucks: { include: { media: true } },
            },
          },
        },
      },
    },
  });
  if (!user) notFound();

  const fileUrls = [
    user.photoUrl,
    ...user.ownedOrders.flatMap((order) =>
      order.subOrders.flatMap((sub) => sub.trucks.flatMap((truck) => truck.media.map((item) => item.url)))
    ),
  ];
  await removePublicFiles(fileUrls);

  await prisma.$transaction(async (tx) => {
    await tx.groupOrder.deleteMany({ where: { ownerId: userId } });
    await tx.user.delete({ where: { id: userId } });
  });
}
