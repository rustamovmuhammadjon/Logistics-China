import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { DashboardResponse } from "@logistics/shared";
import { serverApiOrNull } from "@/lib/server-api";
import { NewOrderForm } from "./NewOrderForm";

export const dynamic = "force-dynamic";

export default async function NewOrderPage() {
  const data = await serverApiOrNull<DashboardResponse>("/api/dashboard");
  if (!data) redirect("/login");
  if (data.user.role !== "CONSIGNEE" && data.user.role !== "COMPANY" && data.user.role !== "EMPLOYEE") {
    redirect("/dashboard");
  }

  return (
    <>
      <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline">
        <ArrowLeft className="h-4 w-4" />
        My orders
      </Link>
      <div className="card mt-3 space-y-4">
        <h1 className="text-xl font-bold text-slate-900">New order</h1>
        <NewOrderForm operators={data.links} />
      </div>
    </>
  );
}
