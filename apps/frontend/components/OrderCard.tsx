import Link from "next/link";
import {
  displayName,
  formatDate,
  formatDirection,
  getOrderHref,
  truckStats,
  type GroupOrderDto,
  type ViewerContext,
} from "@logistics/shared";
import { LocationBadge } from "./LocationBadge";

export function OrderCard({ order, ctx }: { order: GroupOrderDto; ctx: ViewerContext }) {
  const stats = truckStats(order.subOrders.flatMap((s) => s.trucks));
  const hasSubOrders = order.subOrders.length > 0;

  return (
    <Link href={getOrderHref(order, ctx)} className="card block transition hover:-translate-y-0.5 hover:border-brand-300">
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

      {ctx.kind === "admin" && (
        <div className="mt-3 space-y-1 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
          <p>
            <span className="font-medium text-slate-500">Consignee:</span>{" "}
            {order.owner ? `${displayName(order.owner)} · ${order.owner.email}` : "Not assigned"}
          </p>
          <p>
            <span className="font-medium text-slate-500">Operators:</span>{" "}
            {order.operators && order.operators.length > 0
              ? order.operators.map((person) => displayName(person)).join(", ")
              : "None linked"}
          </p>
        </div>
      )}

      {!hasSubOrders && <LocationBadge statusText={order.statusText} updatedAt={order.statusUpdatedAt} />}

      {hasSubOrders && (
        <ul className="mt-3 space-y-2 border-l-2 border-slate-100 pl-3">
          {order.subOrders.map((sub) => {
            const subStats = truckStats(sub.trucks);
            return (
              <li key={sub.id} className="text-sm text-slate-600">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={sub.status === "CLOSED" ? "badge-slate" : "badge-green"}>
                    {sub.status === "CLOSED" ? "Closed" : "Open"}
                  </span>
                  <span>{sub.name || "Sub-order"}</span>
                  <span className="text-xs text-slate-400">
                    {subStats.total} truck{subStats.total === 1 ? "" : "s"}
                  </span>
                </div>
                <LocationBadge statusText={sub.statusText} updatedAt={sub.statusUpdatedAt} />
              </li>
            );
          })}
        </ul>
      )}
    </Link>
  );
}
