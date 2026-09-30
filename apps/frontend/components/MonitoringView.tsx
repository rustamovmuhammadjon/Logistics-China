"use client";

import { useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import { Truck } from "iconsax-react";
import { orderMatchesSearch, truckStats, type GroupOrderDto, type OrderSort, type ViewerContext } from "@logistics/shared";
import { SubOrdersMonitoringTable } from "@/components/SubOrdersMonitoringTable";
import { StatCard } from "@/components/StatCard";
import { EmptyState } from "@/components/EmptyState";

// Every field here was already fetched in one shot (nothing left to
// paginate), so search and sort run entirely client-side — instant on every
// keystroke, no round trip to the backend at all.
export function MonitoringView({
  orders,
  ctx,
  exportHref,
  statIcon,
  emptyIcon,
  emptyTitle,
  emptySearchTitle,
}: {
  orders: GroupOrderDto[];
  ctx: ViewerContext;
  exportHref: string;
  statIcon: React.ReactNode;
  emptyIcon: React.ReactNode;
  emptyTitle: string;
  emptySearchTitle: string;
}) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<OrderSort>("newest");

  const filtered = useMemo(() => {
    const matched = orders.filter((order) => orderMatchesSearch(order, q));
    return [...matched].sort((a, b) => {
      const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sort === "oldest" ? diff : -diff;
    });
  }, [orders, q, sort]);

  const stats = truckStats(filtered.flatMap((o) => o.subOrders.flatMap((s) => s.trucks)));

  return (
    <>
      <div className="-mx-4 flex flex-col gap-3 border-y border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="field-label text-[11px]">Search</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              className="field-input py-1.5 pl-8 text-xs"
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Order, sub-order, truck, trailer, or driver phone"
            />
          </div>
        </div>
        <div className="sm:w-48">
          <label className="field-label text-[11px]">Sort by</label>
          <select
            className="field-input py-1.5 text-xs"
            value={sort}
            onChange={(e) => setSort(e.target.value === "oldest" ? "oldest" : "newest")}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>
        <a href={exportHref} className="btn-secondary shrink-0 px-3 py-1.5 text-xs">
          <Download className="h-3.5 w-3.5" />
          Download Excel
        </a>
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Orders" value={filtered.length} icon={statIcon} />
        <StatCard label="Trucks" value={stats.total} icon={<Truck size={20} variant="Bold" />} />
      </section>

      {!filtered.some((o) => o.subOrders.length > 0) ? (
        <EmptyState icon={emptyIcon} title={q ? emptySearchTitle : emptyTitle} />
      ) : (
        <SubOrdersMonitoringTable orders={filtered} ctx={ctx} />
      )}
    </>
  );
}
