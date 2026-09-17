import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { Box1 } from "iconsax-react";
import { formatDate, formatDirection, isGroupOrderLocked, truckStats, type DashboardResponse } from "@logistics/shared";
import { serverApiOrNull } from "@/lib/server-api";
import { EmptyState } from "@/components/EmptyState";
import { LinkPanel } from "./LinkPanel";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const data = await serverApiOrNull<DashboardResponse>("/api/dashboard");
  if (!data) redirect("/login");

  const role = data.user.role;
  const canManageLinks = role === "CONSIGNEE" || role === "COMPANY";
  const canCreateOrders = canManageLinks || role === "EMPLOYEE";
  // The backend already scopes `orders` correctly per role — no client-side
  // filtering needed here.
  const orders = data.orders;

  return (
    <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{canCreateOrders ? "My orders" : "Orders to track"}</h1>
            <p className="text-sm text-slate-500">
              {canCreateOrders
                ? "Create and manage your orders."
                : "Orders from consignees linked to you. Update truck location and add comments on sub-orders."}
            </p>
          </div>
          {canCreateOrders && (
            <Link href="/dashboard/orders/new" className="btn-primary shrink-0">
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
        {role === "OPERATOR" && (
          <LinkPanel myCode={data.user.linkCode} counterpartLabel="consignee" links={data.links} isConsignee={false} />
        )}

        {orders.length === 0 ? (
          <EmptyState
            icon={<Box1 size={36} variant="Bold" />}
            title={canCreateOrders ? "You haven't created any orders yet." : "No orders yet — link with a consignee above."}
          />
        ) : (
          <ul className="space-y-3">
            {orders.map((order) => {
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

  );
}
