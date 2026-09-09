import Link from "next/link";
import {
  currentTruckOf,
  formatDate,
  formatDirection,
  getOrderHref,
  subOrderStatusLabel,
  truckStats,
  type GroupOrderDto,
  type ViewerContext,
} from "@logistics/shared";

export function OrderCard({ order, ctx }: { order: GroupOrderDto; ctx: ViewerContext }) {
  const stats = truckStats(order.subOrders.flatMap((s) => s.trucks));
  const hasSubOrders = order.subOrders.length > 0;

  return (
    <Link href={getOrderHref(order, ctx)} className="card block transition hover:-translate-y-0.5 hover:border-brand-300">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            {order.name}
            {order.canceledAt ? <span className="badge-red ml-2 align-middle text-xs">Cancelled</span> : null}
          </h2>
          {formatDirection(order.origin, order.destination) && (
            <p className="text-sm text-slate-600">{formatDirection(order.origin, order.destination)}</p>
          )}
          <p className="text-xs text-slate-400">
            Opened {formatDate(order.openedAt)}
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
            <span className="font-medium text-slate-500">Consignee:</span> {order.owner?.email ?? "Not assigned"}
          </p>
          <p>
            <span className="font-medium text-slate-500">Operators:</span>{" "}
            {order.operators && order.operators.length > 0
              ? order.operators.map((person) => person.email).join(", ")
              : "None linked"}
          </p>
        </div>
      )}

      {hasSubOrders && (
        <ul className="mt-3 space-y-2 border-l-2 border-slate-100 pl-3">
          {order.subOrders.map((sub) => {
            const subStats = truckStats(sub.trucks);
            // Cancelled sub-orders don't need their truck to be shown at all.
            // Otherwise, a sub-order's cargo lives in exactly one truck at a
            // time (it may have moved there via a перекид transfer) — show
            // only that current truck, not every truck it ever touched.
            const current = sub.status === "CANCELED" ? null : currentTruckOf(sub.trucks);
            return (
              <li key={sub.id} className="text-sm text-slate-600">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={
                        sub.status === "CANCELED" ? "badge-red" : sub.status === "CLOSED" ? "badge-slate" : "badge-green"
                      }
                    >
                      {subOrderStatusLabel(sub.status)}
                    </span>
                    <span>{sub.name || "Sub-order"}</span>
                  </div>
                  <span className="shrink-0 text-xs text-slate-400">
                    {subStats.total} truck{subStats.total === 1 ? "" : "s"}
                    {sub.status === "CLOSED" && sub.arrivedAt ? ` · Completed ${formatDate(sub.arrivedAt)}` : ""}
                  </span>
                </div>
                {current && (
                  <p className="mt-1 text-xs text-slate-500">
                    <span className="font-medium text-slate-700">{current.plateNumber || "No plate"}</span>
                    {current.trailerPlateNumber ? ` / ${current.trailerPlateNumber}` : ""}
                    {current.driverPhone ? ` · ${current.driverPhone}` : ""}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Link>
  );
}
