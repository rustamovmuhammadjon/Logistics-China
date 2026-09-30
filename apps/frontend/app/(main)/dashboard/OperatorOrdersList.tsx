"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { formatDate, formatDirection, orderMatchesSearch, truckStats, type GroupOrderDto } from "@logistics/shared";

export function OperatorOrdersList({ orders }: { orders: GroupOrderDto[] }) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => orders.filter((order) => orderMatchesSearch(order, q)), [orders, q]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          className="field-input pl-9"
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by order, sub-order, truck, trailer, or driver phone"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="card text-center text-slate-400">No orders match your search.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((order) => {
            const stats = truckStats(order.subOrders.flatMap((s) => s.trucks));
            return (
              <li key={order.id}>
                <Link href={`/dashboard/orders/${order.id}`} className="card flex h-full flex-col gap-2 hover:border-brand-300">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="truncate text-base font-semibold text-slate-900" title={order.name}>
                      {order.name}
                    </h2>
                    <span className="badge-slate shrink-0">{stats.total} trucks</span>
                  </div>
                  {formatDirection(order.origin, order.destination) && (
                    <p className="truncate text-sm text-slate-600">{formatDirection(order.origin, order.destination)}</p>
                  )}
                  <p className="mt-auto text-xs text-slate-400">
                    Opened {formatDate(order.openedAt)} · {order.subOrders.length} sub-order(s)
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
