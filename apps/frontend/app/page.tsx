import { Box1, Truck, Wallet2 } from "iconsax-react";
import { normalizeSort, type MonitoringResponse } from "@logistics/shared";
import { serverApiSafe } from "@/lib/server-api";
import { AppShell } from "@/components/AppShell";
import { OrderCard } from "@/components/OrderCard";
import { SearchSortBar } from "@/components/SearchSortBar";
import { StatCard } from "@/components/StatCard";
import { EmptyState } from "@/components/EmptyState";
import { DbError } from "@/components/DbError";

export const dynamic = "force-dynamic";

export default async function MonitoringPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string }>;
}) {
  const { q, sort } = await searchParams;
  const normalizedSort = normalizeSort(sort);
  const query = new URLSearchParams();
  if (q) query.set("q", q);
  query.set("sort", normalizedSort);

  const { data, error } = await serverApiSafe<MonitoringResponse>(`/api/monitoring/orders?${query.toString()}`);

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Monitoring</h1>
          <p className="text-sm text-slate-500">Live overview of every active order and truck.</p>
        </div>

        {error || !data ? (
          <DbError message={error || "Backend did not return orders."} />
        ) : (
          <>
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Orders" value={data.orders.length} icon={<Box1 size={20} variant="Bold" />} />
          <StatCard label="Trucks" value={data.stats.total} icon={<Truck size={20} variant="Bold" />} />
          <StatCard
            label="Driver paid"
            value={`${data.stats.driverPaid}/${data.stats.total}`}
            icon={<Wallet2 size={20} variant="Bold" />}
          />
          <StatCard label="Customer paid" value={`${data.stats.customerPaid}/${data.stats.total}`} />
        </section>

        <SearchSortBar q={q ?? ""} sort={normalizedSort} />

        {data.orders.length === 0 ? (
          <EmptyState
            icon={<Box1 size={36} variant="Bold" />}
            title={q ? "No active orders match your search." : "No active orders."}
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
    </AppShell>
  );
}
