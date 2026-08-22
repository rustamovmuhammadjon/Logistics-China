import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { AuthMe } from "@logistics/shared";
import { serverApi } from "@/lib/server-api";
import { NewOrderForm } from "./NewOrderForm";

export const dynamic = "force-dynamic";

export default async function NewOrderPage() {
  const me = await serverApi<AuthMe>("/api/auth/me");
  if (!me.user) redirect("/login");
  if (me.user.role !== "CONSIGNEE") redirect("/dashboard");

  return (
    <>
      <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline">
        <ArrowLeft className="h-4 w-4" />
        My orders
      </Link>
      <div className="card mt-3 space-y-4">
        <h1 className="text-xl font-bold text-slate-900">New order</h1>
        <NewOrderForm />
      </div>
    </>
  );
}
