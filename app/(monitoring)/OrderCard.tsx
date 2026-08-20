import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { formatDate, formatDateTime, formatDirection, truckStats } from "@/lib/stats";
import { getOrderHref, type ViewerContext } from "@/lib/order-links";

type OrderWithSubOrders = Prisma.GroupOrderGetPayload<{
  include: { subOrders: { include: { trucks: true } } };
}>;

export function OrderCard({ order, ctx }: { order: OrderWithSubOrders; ctx: ViewerContext }) {
  const stats = truckStats(order.subOrders.flatMap((s) => s.trucks));

  return (
    <Link href={getOrderHref(order, ctx)} className="card block transition hover:border-brand-300 hover:shadow-md">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{order.name}</h2>
          {formatDirection(order.origin, order.destination) && (
            <p className="text-sm text-slate-600">{formatDirection(order.origin, order.destination)}</p>
          )}
          <p className="text-xs text-slate-400">
            Opened {formatDate(order.openedAt)}
            {order.arrivedAt ? ` · Arrived ${formatDate(order.arrivedAt)}` : ""}
            {order.pol ? ` · POL: ${order.pol}` : ""}
            {order.commodity ? ` · ${order.commodity}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="badge-slate">
            {order.subOrders.length} sub-order{order.subOrders.length === 1 ? "" : "s"}
          </span>
          <span className="badge-slate">{stats.total} trucks</span>
          <span className={stats.driverPaid === stats.total && stats.total > 0 ? "badge-green" : "badge-amber"}>
            Driver paid {stats.driverPaid}/{stats.total}
          </span>
          <span className={stats.customerPaid === stats.total && stats.total > 0 ? "badge-green" : "badge-amber"}>
            Customer paid {stats.customerPaid}/{stats.total}
          </span>
        </div>
      </div>

      {order.statusText && (
        <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
          {order.statusText}
          <span className="ml-2 text-xs text-slate-400">(updated {formatDateTime(order.statusUpdatedAt)})</span>
        </p>
      )}

      {order.subOrders.length > 0 && (
        <ul className="mt-3 space-y-1 border-l-2 border-slate-100 pl-3">
          {order.subOrders.map((sub) => {
            const subStats = truckStats(sub.trucks);
            return (
              <li key={sub.id} className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                <span className={sub.status === "CLOSED" ? "badge-slate" : "badge-green"}>
                  {sub.status === "CLOSED" ? "Closed" : "Open"}
                </span>
                <span>{sub.name || "Sub-order"}</span>
                <span className="text-xs text-slate-400">
                  {subStats.total} truck{subStats.total === 1 ? "" : "s"}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Link>
  );
}
