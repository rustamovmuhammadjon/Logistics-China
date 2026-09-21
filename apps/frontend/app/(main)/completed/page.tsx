import { Suspense } from "react";
import { TickCircle, Truck } from "iconsax-react";
import { normalizeSort, withOwnOrders, type MonitoringResponse } from "@logistics/shared";
import { serverApiSafe } from "@/lib/server-api";
import { OrdersTable } from "@/components/OrdersTable";
import { SearchSortBar } from "@/components/SearchSortBar";
import { StatCard } from "@/components/StatCard";
import { EmptyState } from "@/components/EmptyState";
import { DbError } from "@/components/DbError";
import { MonitoringTabs } from "@/components/MonitoringTabs";
import { ResultsSkeleton } from "@/components/ResultsSkeleton";
import { RealtimeMonitoring } from "@/components/RealtimeMonitoring";

export const dynamic = "force-dynamic";

export default async function CompletedOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string }>;
}) {
  const { q, sort } = await searchParams;
  const normalizedSort = normalizeSort(sort);

  return (
    <div className="space-y-6">
      <RealtimeMonitoring />
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Completed orders</h1>
        <p className="text-sm text-slate-500">
          Orders whose sub-orders are all completed. Hidden from the main monitoring page.
        </p>
      </div>

      <MonitoringTabs />

      <SearchSortBar q={q ?? ""} sort={normalizedSort} exportHref="/api/monitoring/export?completed=1" />

      <Suspense fallback={<ResultsSkeleton />}>
        <CompletedResults q={q} sort={normalizedSort} />
      </Suspense>
    </div>
  );
}

async function CompletedResults({ q, sort }: { q?: string; sort: string }) {
  const query = new URLSearchParams({ completed: "1", sort });
  if (q) query.set("q", q);

  const { data, error } = await serverApiSafe<MonitoringResponse>(`/api/monitoring/orders?${query.toString()}`);
  const scoped = data ? withOwnOrders(data, data.user) : null;

  if (error || !scoped) {
    return <DbError message={error || "Backend did not return orders."} />;
  }

  return (
    <>
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Orders" value={scoped.orders.length} icon={<TickCircle size={20} variant="Bold" />} />
        <StatCard label="Trucks" value={scoped.stats.total} icon={<Truck size={20} variant="Bold" />} />
      </section>

      {scoped.orders.length === 0 ? (
        <EmptyState
          icon={<TickCircle size={36} variant="Bold" />}
          title={q ? "No completed orders match your search." : "No completed orders yet."}
        />
      ) : (
        <OrdersTable orders={scoped.orders} ctx={scoped.ctx} />
      )}
    </>
  );
}
