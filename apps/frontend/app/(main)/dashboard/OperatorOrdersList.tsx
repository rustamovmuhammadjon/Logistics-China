"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { formatDate, formatDirection, truckStats, type GroupOrderDto } from "@logistics/shared";

export function OperatorOrdersList({ orders }: { orders: GroupOrderDto[] }) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return orders;
    return orders.filter((order) => {
      if (order.name.toLowerCase().includes(query)) return true;
      return order.subOrders.some((sub) => {
        if (sub.name?.toLowerCase().includes(query)) return true;
        return sub.trucks.some((truck) =>
          [truck.plateNumber, truck.trailerPlateNumber, truck.driverPhone].some((value) =>
            value?.toLowerCase().includes(query)
          )
        );
      });
    });
  }, [orders, q]);

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
        <ul className="space-y-3">
          {filtered.map((order) => {
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
