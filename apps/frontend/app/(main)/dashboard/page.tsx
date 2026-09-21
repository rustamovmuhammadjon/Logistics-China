import Link from "next/link";
import { redirect } from "next/navigation";
import { Box1 } from "iconsax-react";
import type { CompanyAnalyticsDto, DashboardResponse, OperatorCompanyAnalyticsDto } from "@logistics/shared";
import { serverApiOrNull } from "@/lib/server-api";
import { EmptyState } from "@/components/EmptyState";
import { LinkPanel } from "@/components/LinkPanel";
import { CompanyAnalytics } from "./CompanyAnalytics";
import { OperatorCompanyAnalytics } from "./OperatorCompanyAnalytics";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // Individual entrepreneurs and employees manage their orders from the
  // standalone /orders page now — dashboard is company analytics, or (for
  // operators) the existing linked-orders view below.
  const me = await serverApiOrNull<DashboardResponse>("/api/dashboard");
  if (!me) redirect("/login");

  if (me.user.role === "CONSIGNEE" || me.user.role === "EMPLOYEE") redirect("/orders");

  if (me.user.role === "COMPANY") {
    const analytics = await serverApiOrNull<CompanyAnalyticsDto>("/api/company/analytics");
    if (!analytics) redirect("/login");
    return <CompanyAnalytics data={analytics} />;
  }

  // "Company for tracking" — never confuse with COMPANY above, the
  // "company for orders". It never tracks orders itself, only its OPERATOR
  // employees do (see /operators).
  if (me.user.role === "OPERATOR_COMPANY") {
    const analytics = await serverApiOrNull<OperatorCompanyAnalyticsDto>("/api/operator-company/analytics");
    if (!analytics) redirect("/login");
    return <OperatorCompanyAnalytics data={analytics} />;
  }

  // OPERATOR: unchanged from before — link with consignees/companies and
  // browse the orders they've made visible.
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Orders to track</h1>
        <p className="text-sm text-slate-500">
          Orders from consignees linked to you. Update truck location and add comments on sub-orders.
        </p>
      </div>

      <LinkPanel myCode={me.user.linkCode} counterpartLabel="consignee" links={me.links} isConsignee={false} />

      {me.orders.length === 0 ? (
        <EmptyState icon={<Box1 size={36} variant="Bold" />} title="No orders yet — link with a consignee above." />
      ) : (
        <ul className="space-y-3">
          {me.orders.map((order) => (
            <li key={order.id}>
              <Link href={`/dashboard/orders/${order.id}`} className="card block hover:border-brand-300">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h2 className="text-lg font-semibold text-slate-900">{order.name}</h2>
                  <span className="badge-slate">{order.subOrders.length} sub-order(s)</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
