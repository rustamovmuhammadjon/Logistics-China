import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { AuthMe, GroupOrderDto } from "@logistics/shared";
import { serverApi, serverApiOrNull } from "@/lib/server-api";
import { AppShell } from "@/components/AppShell";
import { ConsigneeOrderDetail } from "./ConsigneeOrderDetail";
import { OperatorOrderDetail } from "./OperatorOrderDetail";

export const dynamic = "force-dynamic";

export default async function DashboardOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await serverApi<AuthMe>("/api/auth/me");
  if (!me.user) redirect("/login");

  const path = me.user.role === "CONSIGNEE" ? `/api/consignee/orders/${id}` : `/api/operator/orders/${id}`;
  const data = await serverApiOrNull<{ order: GroupOrderDto }>(path);
  if (!data) notFound();

  return (
    <AppShell>
      <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline">
        <ArrowLeft className="h-4 w-4" />
        {me.user.role === "CONSIGNEE" ? "My orders" : "Orders to track"}
      </Link>
      <div className="mt-3">
        {me.user.role === "CONSIGNEE" ? (
          <ConsigneeOrderDetail order={data.order} />
        ) : (
          <OperatorOrderDetail order={data.order} />
        )}
      </div>
    </AppShell>
  );
}
