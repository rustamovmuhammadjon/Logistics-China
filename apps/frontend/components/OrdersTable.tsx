"use client";

import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  currentTruckOf,
  formatDate,
  formatDateTime,
  formatDirection,
  freshnessBadgeClass,
  locationFreshness,
  subOrderStatusLabel,
  truckStats,
  type GroupOrderDto,
  type ViewerContext,
} from "@logistics/shared";

export function OrdersTable({ orders, ctx }: { orders: GroupOrderDto[]; ctx: ViewerContext }) {
  const isAdmin = ctx.kind === "admin";
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const colSpan = isAdmin ? 7 : 5;

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="card w-full overflow-x-auto p-0">
      <table className="w-full min-w-[900px] table-fixed text-sm">
        <colgroup>
          {isAdmin ? (
            <>
              <col style={{ width: "18%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "8%" }} />
              <col style={{ width: "21%" }} />
              <col style={{ width: "21%" }} />
            </>
          ) : (
            <>
              <col style={{ width: "30%" }} />
              <col style={{ width: "20%" }} />
              <col style={{ width: "18%" }} />
              <col style={{ width: "16%" }} />
              <col style={{ width: "16%" }} />
            </>
          )}
        </colgroup>
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <th className="px-4 py-3">Order</th>
            <th className="px-4 py-3">Direction</th>
            <th className="px-4 py-3">Opened</th>
            <th className="px-4 py-3">Sub-orders</th>
            <th className="px-4 py-3">Trucks</th>
            {isAdmin && <th className="px-4 py-3">Consignee</th>}
            {isAdmin && <th className="px-4 py-3">Operators</th>}
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => {
            const stats = truckStats(order.subOrders.flatMap((s) => s.trucks));
            const isOpen = expanded.has(order.id);
            return (
              <Fragment key={order.id}>
                <tr
                  onClick={() => toggle(order.id)}
                  className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                      )}
                      <span className="truncate font-medium text-slate-900" title={order.name}>
                        {order.name}
                      </span>
                      {order.canceledAt ? <span className="badge-red shrink-0 text-xs">Cancelled</span> : null}
                    </div>
                  </td>
                  <td className="truncate px-4 py-3 text-slate-600">
                    {formatDirection(order.origin, order.destination) || "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(order.openedAt)}</td>
                  <td className="px-4 py-3 text-slate-600">{order.subOrders.length}</td>
                  <td className="px-4 py-3 text-slate-600">{stats.total}</td>
                  {isAdmin && (
                    <td className="truncate px-4 py-3 text-slate-600" title={order.owner?.email ?? undefined}>
                      {order.owner?.email ?? "Not assigned"}
                    </td>
                  )}
                  {isAdmin && (
                    <td
                      className="truncate px-4 py-3 text-slate-600"
                      title={order.operators?.map((p) => p.email).join(", ") ?? undefined}
                    >
                      {order.operators && order.operators.length > 0
                        ? order.operators.map((person) => person.email).join(", ")
                        : "None linked"}
                    </td>
                  )}
                </tr>
                {isOpen && (
                  <tr className="border-b border-slate-100 bg-slate-50/60 last:border-0">
                    <td colSpan={colSpan} className="p-4">
                      <SubOrdersTable order={order} />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SubOrdersTable({ order }: { order: GroupOrderDto }) {
  if (order.subOrders.length === 0) {
    return <p className="text-sm text-slate-400">No sub-orders yet.</p>;
  }

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full min-w-[1100px] table-fixed text-sm">
        <colgroup>
          <col style={{ width: "10%" }} />
          <col style={{ width: "8%" }} />
          <col style={{ width: "11%" }} />
          <col style={{ width: "11%" }} />
          <col style={{ width: "12%" }} />
          <col style={{ width: "9%" }} />
          <col style={{ width: "14%" }} />
          <col style={{ width: "13%" }} />
          <col style={{ width: "12%" }} />
        </colgroup>
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <th className="px-4 py-3">Sub-order</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Truck #</th>
            <th className="px-4 py-3">Trailer #</th>
            <th className="px-4 py-3">Driver #</th>
            <th className="px-4 py-3">Gross weight</th>
            <th className="px-4 py-3">Current location</th>
            <th className="px-4 py-3">Last update</th>
            <th className="px-4 py-3">Comment</th>
          </tr>
        </thead>
        <tbody>
          {order.subOrders.map((sub) => {
            // Cancelled sub-orders don't need their truck shown; otherwise a
            // sub-order's cargo lives in exactly one truck at a time.
            const current = sub.status === "CANCELED" ? null : currentTruckOf(sub.trucks);
            const freshness = locationFreshness(current?.locationUpdatedAt);
            const comment = sub.comments?.[0]?.text ?? null;
            return (
              <tr key={sub.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="truncate px-4 py-3 font-medium text-slate-800" title={sub.name ?? undefined}>
                  {sub.name || "Sub-order"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={
                      sub.status === "CANCELED" ? "badge-red" : sub.status === "CLOSED" ? "badge-slate" : "badge-green"
                    }
                  >
                    {subOrderStatusLabel(sub.status)}
                  </span>
                </td>
                <td className="truncate px-4 py-3 text-slate-600">{current?.plateNumber || "—"}</td>
                <td className="truncate px-4 py-3 text-slate-600">{current?.trailerPlateNumber || "—"}</td>
                <td className="truncate px-4 py-3 text-slate-600">{current?.driverPhone || "—"}</td>
                <td className="truncate px-4 py-3 text-slate-600">
                  {current?.cargoWeight != null ? `${current.cargoWeight} kg` : "—"}
                </td>
                <td className="truncate px-4 py-3 text-slate-600" title={current?.currentLocation ?? undefined}>
                  {current?.currentLocation || "—"}
                </td>
                <td className="px-4 py-3">
                  {current?.locationUpdatedAt ? (
                    <span className={freshnessBadgeClass(freshness)}>{formatDateTime(current.locationUpdatedAt)}</span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="truncate px-4 py-3 text-slate-600" title={comment ?? undefined}>
                  {comment || "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
