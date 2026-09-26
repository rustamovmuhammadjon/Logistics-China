import { Suspense } from "react";
import { Box1, Truck } from "iconsax-react";
import { normalizeSort, withOwnOrders, type MonitoringResponse } from "@logistics/shared";
import { serverApiSafe } from "@/lib/server-api";
import { SubOrdersMonitoringTable } from "@/components/SubOrdersMonitoringTable";
import { SearchSortBar } from "@/components/SearchSortBar";
import { StatCard } from "@/components/StatCard";
import { EmptyState } from "@/components/EmptyState";
import { DbError } from "@/components/DbError";
import { MonitoringTabs } from "@/components/MonitoringTabs";
import { ResultsSkeleton } from "@/components/ResultsSkeleton";

export const dynamic = "force-dynamic";

export default async function MonitoringPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string }>;
}) {
  const { q, sort } = await searchParams;
  const normalizedSort = normalizeSort(sort);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Monitoring</h1>
        <p className="text-sm text-slate-500">Live overview of every active order and truck.</p>
      </div>

      <MonitoringTabs />

      <SearchSortBar q={q ?? ""} sort={normalizedSort} exportHref="/api/monitoring/export" />

      <Suspense fallback={<ResultsSkeleton />}>
        <MonitoringResults q={q} sort={normalizedSort} />
      </Suspense>
    </div>
  );
}

async function MonitoringResults({ q, sort }: { q?: string; sort: string }) {
  const query = new URLSearchParams();
  if (q) query.set("q", q);
  query.set("sort", sort);

  const { data, error } = await serverApiSafe<MonitoringResponse>(`/api/monitoring/orders?${query.toString()}`);
  const scoped = data ? withOwnOrders(data, data.user) : null;

  if (error || !scoped) {
    return <DbError message={error || "Backend did not return orders."} />;
  }

  return (
    <>
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Orders" value={scoped.orders.length} icon={<Box1 size={20} variant="Bold" />} />
        <StatCard label="Trucks" value={scoped.stats.total} icon={<Truck size={20} variant="Bold" />} />
      </section>

      {!scoped.orders.some((o) => o.subOrders.length > 0) ? (
        <EmptyState
          icon={<Box1 size={36} variant="Bold" />}
          title={q ? "No active sub-orders match your search." : "No active sub-orders."}
        />
      ) : (
        <SubOrdersMonitoringTable orders={scoped.orders} ctx={scoped.ctx} />
      )}
    </>
  );
}
