import Link from "next/link";
import { Plus } from "lucide-react";
import { formatDate, formatDateTime, formatDirection, truckStats, type GroupOrderDto } from "@logistics/shared";
import { serverApi } from "@/lib/server-api";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { Box1 } from "iconsax-react";
import { AdminNewOrderForm } from "./AdminNewOrderForm";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const { orders } = await serverApi<{ orders: GroupOrderDto[] }>("/api/admin/orders");

  return (
    <AppShell>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Orders</h1>
          <p className="text-sm text-slate-500">Manage group orders, sub-orders and trucks.</p>
        </div>

        <details className="card">
          <summary className="flex cursor-pointer items-center gap-2 font-semibold text-slate-800">
            <Plus className="h-4 w-4" />
            New group order
          </summary>
          <div className="mt-4">
            <AdminNewOrderForm />
          </div>
        </details>

        {orders.length === 0 ? (
          <EmptyState icon={<Box1 size={36} variant="Bold" />} title="No orders yet." />
        ) : (
          <ul className="space-y-3">
            {orders.map((order) => {
              const stats = truckStats(order.subOrders.flatMap((s) => s.trucks));
              return (
                <li key={order.id}>
                  <Link href={`/admin/orders/${order.id}`} className="card block hover:border-brand-300">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-semibold text-slate-900">{order.name}</h2>
                        <p className="text-xs text-slate-400">
                          Opened {formatDate(order.openedAt)} · {order.subOrders.length} sub-order(s)
                          {formatDirection(order.origin, order.destination) &&
                            ` · ${formatDirection(order.origin, order.destination)}`}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className="badge-slate">{stats.total} trucks</span>
                        <span className={stats.driverPaid === stats.total && stats.total > 0 ? "badge-green" : "badge-amber"}>
                          Driver {stats.driverPaid}/{stats.total}
                        </span>
                        <span className={stats.customerPaid === stats.total && stats.total > 0 ? "badge-green" : "badge-amber"}>
                          Customer {stats.customerPaid}/{stats.total}
                        </span>
                      </div>
                    </div>
                    {order.statusText && (
                      <p className="mt-2 text-sm text-slate-600">
                        {order.statusText}{" "}
                        <span className="text-xs text-slate-400">({formatDateTime(order.statusUpdatedAt)})</span>
                      </p>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
