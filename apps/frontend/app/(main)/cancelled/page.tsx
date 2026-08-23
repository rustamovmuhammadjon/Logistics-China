import { CloseCircle, Truck, Wallet2 } from "iconsax-react";
import { normalizeSort, type MonitoringResponse } from "@logistics/shared";
import { serverApiSafe } from "@/lib/server-api";
import { OrderCard } from "@/components/OrderCard";
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Cancelled orders</h1>
        <p className="text-sm text-slate-500">
          Group orders that were cancelled. They are hidden from monitoring. Cancelled sub-orders stay inside their
          parent order and do not move a whole order here.
        </p>
      </div>

      {error || !data ? (
        <DbError message={error || "Backend did not return orders."} />
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Orders" value={data.orders.length} icon={<CloseCircle size={20} variant="Bold" />} />
            <StatCard label="Trucks" value={data.stats.total} icon={<Truck size={20} variant="Bold" />} />
            <StatCard label="Driver paid" value={`${data.stats.driverPaid}/${data.stats.total}`} />
            <StatCard
              label="Customer paid"
              value={`${data.stats.customerPaid}/${data.stats.total}`}
              icon={<Wallet2 size={20} variant="Bold" />}
            />
          </section>

          <SearchSortBar q={q ?? ""} sort={normalizedSort} />

          {data.orders.length === 0 ? (
            <EmptyState
              icon={<CloseCircle size={36} variant="Bold" />}
              title={q ? "No cancelled orders match your search." : "No cancelled orders yet."}
            />
          ) : (
            <ul className="space-y-4">
              {data.orders.map((order) => (
                <li key={order.id}>
                  <OrderCard order={order} ctx={data.ctx} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
