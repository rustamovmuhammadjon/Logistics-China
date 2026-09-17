import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { Box1 } from "iconsax-react";
import { formatDate, formatDirection, isGroupOrderLocked, truckStats, type DashboardResponse } from "@logistics/shared";
import { serverApiOrNull } from "@/lib/server-api";
import { EmptyState } from "@/components/EmptyState";
import { LinkPanel } from "@/components/LinkPanel";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const data = await serverApiOrNull<DashboardResponse>("/api/dashboard");
  if (!data) redirect("/login");

  const role = data.user.role;
  if (role !== "CONSIGNEE" && role !== "COMPANY" && role !== "EMPLOYEE") redirect("/dashboard");

  const canCreate = role === "CONSIGNEE" || role === "EMPLOYEE";
  const canManageLinks = role === "CONSIGNEE" || role === "COMPANY";
  const orders = data.orders;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Orders</h1>
          <p className="text-sm text-slate-500">
            {role === "COMPANY"
              ? "Orders your employees have created. Only an employee can create, edit, cancel, or complete an order."
              : "Create and manage your orders."}
          </p>
        </div>
        {canCreate && (
          <Link href="/orders/new" className="btn-primary shrink-0">
            <Plus className="h-4 w-4" />
            New order
          </Link>
        )}
      </div>

      {canManageLinks && (
        <LinkPanel
          myCode={data.user.linkCode}
          counterpartLabel="operator"
          links={data.links}
          isConsignee
          activeOrders={orders.filter((order) => !isGroupOrderLocked(order)).map((order) => ({ id: order.id, name: order.name }))}
        />
      )}

      {orders.length === 0 ? (
        <EmptyState
          icon={<Box1 size={36} variant="Bold" />}
          title={canCreate ? "You haven't created any orders yet." : "No orders yet — your employees haven't created any."}
        />
      ) : (
        <ul className="space-y-3">
          {orders.map((order) => {
            const stats = truckStats(order.subOrders.flatMap((s) => s.trucks));
            return (
              <li key={order.id}>
                <Link href={`/orders/${order.id}`} className="card block hover:border-brand-300">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">{order.name}</h2>
                      {formatDirection(order.origin, order.destination) && (
                        <p className="text-sm text-slate-600">{formatDirection(order.origin, order.destination)}</p>
                      )}
                      <p className="text-xs text-slate-400">
                        Opened {formatDate(order.openedAt)} · {order.subOrders.length} sub-order(s)
                      </p>
                    </div>
                    <span className="badge-slate">{stats.total} trucks</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
