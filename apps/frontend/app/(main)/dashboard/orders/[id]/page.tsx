import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { AuthMe, GroupOrderDto } from "@logistics/shared";
import { serverApi, serverApiOrNull } from "@/lib/server-api";
import { OperatorOrderDetail } from "./OperatorOrderDetail";

export const dynamic = "force-dynamic";

export default async function DashboardOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await serverApi<AuthMe>("/api/auth/me");
  if (!me.user) redirect("/login");

  // Individual entrepreneurs, companies, and employees manage their own
  // orders from the standalone /orders page now — this route stays only
  // for operators viewing a linked consignee's/company's order.
  if (me.user.role !== "OPERATOR") redirect(`/orders/${id}`);

  const data = await serverApiOrNull<{ order: GroupOrderDto }>(`/api/operator/orders/${id}`);
  if (!data) notFound();

  return (
    <>
      <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline">
        <ArrowLeft className="h-4 w-4" />
        Orders to track
      </Link>
      <div className="mt-3">
        <OperatorOrderDetail order={data.order} />
      </div>
    </>
  );
}
