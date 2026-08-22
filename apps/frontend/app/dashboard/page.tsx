import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { Box1 } from "iconsax-react";
import { formatDate, formatDirection, truckStats, type DashboardResponse } from "@logistics/shared";
import { serverApiOrNull } from "@/lib/server-api";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { LinkPanel } from "./LinkPanel";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const data = await serverApiOrNull<DashboardResponse>("/api/dashboard");
  if (!data) redirect("/login");

  const isConsignee = data.user.role === "CONSIGNEE";

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{isConsignee ? "My orders" : "Orders to track"}</h1>
            <p className="text-sm text-slate-500">
              {isConsignee
                ? "Create and manage your own orders."
                : "Orders from consignees linked to you. Update truck location and leave comments."}
            </p>
          </div>
          {isConsignee && (
            <Link href="/dashboard/orders/new" className="btn-primary shrink-0">
              <Plus className="h-4 w-4" />
              New order
            </Link>
          )}
        </div>

        <LinkPanel
          myCode={data.user.linkCode}
          counterpartLabel={isConsignee ? "operator" : "consignee"}
          links={data.links}
        />

        {data.orders.length === 0 ? (
          <EmptyState
            icon={<Box1 size={36} variant="Bold" />}
            title={isConsignee ? "You haven't created any orders yet." : "No orders yet — link with a consignee above."}
          />
        ) : (
          <ul className="space-y-3">
            {data.orders.map((order) => {
              const stats = truckStats(order.subOrders.flatMap((s) => s.trucks));
              return (
                <li key={order.id}>
                  <Link href={`/dashboard/orders/${order.id}`} className="card block hover:border-brand-300">
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
    </AppShell>
  );
}
