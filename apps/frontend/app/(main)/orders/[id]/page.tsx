import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { AuthMe, GroupOrderDto } from "@logistics/shared";
import { serverApi, serverApiOrNull } from "@/lib/server-api";
import { ConsigneeOrderDetail } from "./ConsigneeOrderDetail";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await serverApi<AuthMe>("/api/auth/me");
  if (!me.user) redirect("/login");

  const role = me.user.role;
  if (role !== "CONSIGNEE" && role !== "COMPANY" && role !== "EMPLOYEE") {
    // Operators (and anyone else) keep using the dashboard's order view.
    redirect(`/dashboard/orders/${id}`);
  }

  const data = await serverApiOrNull<{ order: GroupOrderDto }>(`/api/consignee/orders/${id}`);
  if (!data) notFound();

  const canWrite = role === "CONSIGNEE" || (role === "EMPLOYEE" && data.order.createdByUserId === me.user.id);
  const readOnlyReason =
    role === "COMPANY"
      ? "Companies can only view orders — an employee creates and manages them."
      : role === "EMPLOYEE"
        ? "Only the employee who created this order can change it."
        : undefined;

  return (
    <>
      <Link href="/orders" className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline">
        <ArrowLeft className="h-4 w-4" />
        Orders
      </Link>
      <div className="mt-3">
        <ConsigneeOrderDetail order={data.order} canWrite={canWrite} readOnlyReason={readOnlyReason} />
      </div>
    </>
  );
}
