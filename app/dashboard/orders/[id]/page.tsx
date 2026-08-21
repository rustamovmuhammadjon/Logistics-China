import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import AppShell from "@/app/AppShell";
import { ConsigneeOrderDetail } from "./ConsigneeOrderDetail";
import { OperatorOrderDetail } from "./OperatorOrderDetail";

export const dynamic = "force-dynamic";

export default async function DashboardOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const order = await prisma.groupOrder.findUnique({
    where: { id },
    include: {
      comments: { orderBy: { createdAt: "desc" } },
      subOrders: {
        orderBy: { createdAt: "asc" },
        include: {
          comments: { orderBy: { createdAt: "desc" } },
          trucks: {
            orderBy: { createdAt: "asc" },
            include: { comments: { orderBy: { createdAt: "desc" } } },
          },
        },
      },
    },
  });

  if (!order) notFound();

  if (user.role === "CONSIGNEE") {
    if (order.ownerId !== user.id) notFound();
    return (
      <AppShell>
        <Link href="/dashboard" className="text-sm text-brand-600 hover:underline">
          ← My orders
        </Link>
        <div className="mt-3">
          <ConsigneeOrderDetail order={order} />
        </div>
      </AppShell>
    );
  }

  // OPERATOR
  if (!order.ownerId) notFound();
  const link = await prisma.operatorLink.findUnique({
    where: { consigneeId_operatorId: { consigneeId: order.ownerId, operatorId: user.id } },
  });
  if (!link) notFound();

  return (
    <AppShell>
      <Link href="/dashboard" className="text-sm text-brand-600 hover:underline">
        ← Orders to track
      </Link>
      <div className="mt-3">
        <OperatorOrderDetail order={order} />
      </div>
    </AppShell>
  );
}
