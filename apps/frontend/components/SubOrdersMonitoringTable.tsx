"use client";

import Link from "next/link";
import { useState } from "react";
import {
  agentLabel,
  COMMENT_PREVIEW_LENGTH,
  currentTruckOf,
  formatDate,
  formatUpdateTime,
  freshnessBadgeClass,
  getOrderHref,
  locationFreshness,
  subOrderStatusLabel,
  type GroupOrderDto,
  type ViewerContext,
} from "@logistics/shared";
import { Track718MapButton } from "@/components/Track718MapModal";
import { DgBadge } from "@/components/DangerousGoods";

// Nothing is cut off: every column is as wide as its longest value and the
// table scrolls sideways when that's wider than the screen.
const TH = "whitespace-nowrap px-3 py-2 text-[11px]";
const TD = "whitespace-nowrap px-3 py-2 text-xs";

// Monitoring tracks sub-orders directly (each one is a single truck load) —
// no more clicking an order row to reveal its sub-orders underneath. Every
// row here IS a sub-order, with an "Order" column so it's still clear which
// order it belongs to.
export function SubOrdersMonitoringTable({ orders, ctx }: { orders: GroupOrderDto[]; ctx: ViewerContext }) {
  const isOperator = ctx.kind === "operator";
  const rows = orders.flatMap((order) => order.subOrders.map((sub) => ({ order, sub })));

  if (rows.length === 0) return null;

  return (
    <div className="-mx-4 overflow-x-auto border-y border-slate-200 bg-white">
      <table className="w-max min-w-full">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-left font-semibold uppercase tracking-wide text-slate-500">
            <th className={TH}>Order</th>
            <th className={TH}>Sub-order</th>
            <th className={TH}>DG</th>
            <th className={TH}>FLD</th>
            <th className={TH}>Truck #</th>
            {isOperator && <th className={TH}>GPS #</th>}
            <th className={TH}>Country</th>
            <th className={TH}>Trailer #</th>
            <th className={TH}>Driver #</th>
            <th className={TH}>Agent</th>
            <th className={TH}>Weight</th>
            <th className={TH}>Current location</th>
            <th className={TH}>Last update</th>
            <th className={TH}>Comment</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ order, sub }) => {
            // Cancelled sub-orders don't need their truck shown; otherwise a
            // sub-order's cargo lives in exactly one truck at a time.
            const current = sub.status === "CANCELED" ? null : currentTruckOf(sub.trucks);
            // Last update reflects ANY change to this sub-order or its
            // trucks (a comment, a truck edit, a transfer, ...) — not just a
            // location change — so it's driven by lastEditedAt, not by the
            // truck's own locationUpdatedAt.
            const freshness = locationFreshness(sub.lastEditedAt);
            const comment = sub.comments?.[0]?.text ?? null;
            const agents = sub.agents ?? [];
            return (
              <tr key={sub.id} className="border-b border-slate-100 align-top last:border-0 hover:bg-slate-50">
                <td className={TD}>
                  <Link href={getOrderHref(order, ctx)} className="text-brand-600 hover:underline">
                    {order.name}
                  </Link>
                  {order.canceledAt ? <span className="badge-red ml-1.5 text-[10px]">Cancelled</span> : null}
                </td>
                <td className={`${TD} font-medium text-slate-800`} title={subOrderStatusLabel(sub.status)}>
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${
                        sub.status === "CANCELED" ? "bg-red-500" : sub.status === "CLOSED" ? "bg-slate-400" : "bg-emerald-500"
                      }`}
                    />
                    {sub.name || "Sub-order"}
                  </span>
                </td>
                <td className={TD}>
                  <DgBadge dangerousGoods={order.dangerousGoods} className="px-1.5 text-[10px]" />
                </td>
                <td className={`${TD} text-slate-600`}>{formatDate(sub.factoryLoadDate) || "—"}</td>
                <td className={`${TD} text-slate-600`}>{current?.plateNumber || "—"}</td>
                {isOperator && (
                  <td className={`${TD} text-slate-600`}>
                    <span className="flex items-center gap-1">
                      <span>{current?.gpsNumber || "—"}</span>
                      {current?.track718 && (
                        <Track718MapButton
                          eventsUrl={`/api/operator/orders/${order.id}/sub-orders/${sub.id}/trucks/${current.id}/track718/events`}
                          compact
                        />
                      )}
                    </span>
                  </td>
                )}
                <td className={`${TD} text-slate-600`}>{current?.country || "—"}</td>
                <td className={`${TD} text-slate-600`}>{current?.trailerPlateNumber || "—"}</td>
                <td className={`${TD} text-slate-600`}>{current?.driverPhone || "—"}</td>
                <td
                  className={`${TD} text-slate-600`}
                  title={agents.map(({ agent }) => [agentLabel(agent), agent.phone].filter(Boolean).join(" · ")).join("\n") || undefined}
                >
                  {agents.length > 0 ? agents.map(({ agent }) => agent.name).join(", ") : "—"}
                </td>
                <td className={`${TD} text-slate-600`}>
                  {current?.cargoWeight != null ? `${current.cargoWeight} t` : "—"}
                </td>
                <td className={`${TD} text-slate-600`}>{current?.currentLocation || "—"}</td>
                <td className={TD}>
                  {sub.lastEditedAt ? (
                    <span className={freshnessBadgeClass(freshness)}>{formatUpdateTime(sub.lastEditedAt)}</span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className={`${TD} text-slate-600`}>{comment ? <CommentPreview text={comment} /> : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// The first 50 characters, then "..."; a click opens the whole comment
// (wrapped, so a long one doesn't stretch the table) and another closes it.
function CommentPreview({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  if (text.length <= COMMENT_PREVIEW_LENGTH) return <>{text}</>;

  return (
    <button
      type="button"
      onClick={() => setOpen((v) => !v)}
      className={`text-left hover:text-slate-900 ${open ? "block max-w-xs whitespace-normal break-words" : ""}`}
      title={open ? "Click to collapse" : "Click to read the whole comment"}
      aria-expanded={open}
    >
      {open ? text : `${text.slice(0, COMMENT_PREVIEW_LENGTH).trimEnd()}...`}
    </button>
  );
}
