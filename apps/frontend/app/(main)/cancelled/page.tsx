import { CloseCircle, Truck } from "iconsax-react";
import { normalizeSort, withOwnOrders, type MonitoringResponse } from "@logistics/shared";
import { serverApiSafe } from "@/lib/server-api";
import { OrdersTable } from "@/components/OrdersTable";
import { SearchSortBar } from "@/components/SearchSortBar";
import { StatCard } from "@/components/StatCard";
import { EmptyState } from "@/components/EmptyState";
import { DbError } from "@/components/DbError";

export const dynamic = "force-dynamic";

export default async function CancelledOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string }>;
}) {
  const { q, sort } = await searchParams;
  const normalizedSort = normalizeSort(sort);
  const query = new URLSearchParams({ canceled: "1", sort: normalizedSort });
  if (q) query.set("q", q);

  const { data, error } = await serverApiSafe<MonitoringResponse>(`/api/monitoring/orders?${query.toString()}`);
  const scoped = data ? withOwnOrders(data, data.user) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Cancelled orders</h1>
        <p className="text-sm text-slate-500">
          Group orders that were cancelled. They are hidden from monitoring. Cancelled sub-orders stay inside their
          parent order and do not move a whole order here.
        </p>
      </div>

      {error || !scoped ? (
        <DbError message={error || "Backend did not return orders."} />
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Orders" value={scoped.orders.length} icon={<CloseCircle size={20} variant="Bold" />} />
            <StatCard label="Trucks" value={scoped.stats.total} icon={<Truck size={20} variant="Bold" />} />
          </section>

          <SearchSortBar q={q ?? ""} sort={normalizedSort} />

          {scoped.orders.length === 0 ? (
            <EmptyState
              icon={<CloseCircle size={36} variant="Bold" />}
              title={q ? "No cancelled orders match your search." : "No cancelled orders yet."}
            />
          ) : (
            <OrdersTable orders={scoped.orders} ctx={scoped.ctx} />
          )}
        </>
      )}
    </div>
  );
}
