import { prisma } from "@/lib/prisma";
import { truckStats } from "@/lib/stats";
import { getViewerContext } from "@/lib/order-links";
import { buildOrderOrderBy, buildOrderWhere, normalizeSort } from "@/lib/order-query";
import { SearchSortBar } from "./SearchSortBar";
import { OrderCard } from "./OrderCard";

export const dynamic = "force-dynamic";

export default async function MonitoringPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string }>;
}) {
  const { q, sort } = await searchParams;
  const normalizedSort = normalizeSort(sort);

  const [groupOrders, ctx] = await Promise.all([
    prisma.groupOrder.findMany({
      where: buildOrderWhere(false, q),
      include: { subOrders: { include: { trucks: true } } },
      orderBy: buildOrderOrderBy(normalizedSort),
    }),
    getViewerContext(),
  ]);

  const overall = truckStats(groupOrders.flatMap((o) => o.subOrders.flatMap((s) => s.trucks)));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Monitoring</h1>
        <p className="text-sm text-slate-500">Live overview of every active order and truck.</p>
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Orders" value={groupOrders.length} />
        <StatCard label="Trucks" value={overall.total} />
        <StatCard label="Driver paid" value={`${overall.driverPaid}/${overall.total}`} />
        <StatCard label="Customer paid" value={`${overall.customerPaid}/${overall.total}`} />
      </section>

      <SearchSortBar q={q ?? ""} sort={normalizedSort} />

      {groupOrders.length === 0 ? (
        <p className="card text-center text-slate-400">
          {q ? "No active orders match your search." : "No active orders."}
        </p>
      ) : (
        <ul className="space-y-4">
          {groupOrders.map((order) => (
            <li key={order.id}>
              <OrderCard order={order} ctx={ctx} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card text-center">
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  );
}
