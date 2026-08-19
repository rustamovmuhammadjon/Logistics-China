import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { truckStats, formatDate, formatDateTime, formatDirection } from "@/lib/stats";
import { getViewerSession, isAdminAuthenticated } from "@/lib/auth";
import { logoutUserAction } from "@/lib/actions/user-auth";

export const dynamic = "force-dynamic";

export default async function MonitoringPage() {
  const [viewer, admin] = await Promise.all([getViewerSession(), isAdminAuthenticated()]);

  const groupOrders = await prisma.groupOrder.findMany({
    include: {
      subOrders: {
        include: { trucks: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const overall = truckStats(groupOrders.flatMap((o) => o.subOrders.flatMap((s) => s.trucks)));

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">China–Iran Logistics Monitoring</h1>
          <p className="text-sm text-slate-500">Live overview of every order and truck.</p>
        </div>
        <div className="flex items-center gap-3">
          {viewer && <span className="text-sm text-slate-500">{viewer.email}</span>}
          {admin && <span className="badge-slate">admin</span>}
          {viewer && (
            <form action={logoutUserAction}>
              <button type="submit" className="btn-secondary">
                Log out
              </button>
            </form>
          )}
          <Link href="/admin" className="btn-secondary shrink-0">
            Admin panel
          </Link>
        </div>
      </header>

      <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Orders" value={groupOrders.length} />
        <StatCard label="Trucks" value={overall.total} />
        <StatCard label="Driver paid" value={`${overall.driverPaid}/${overall.total}`} />
        <StatCard label="Customer paid" value={`${overall.customerPaid}/${overall.total}`} />
      </section>

      {groupOrders.length === 0 ? (
        <p className="card text-center text-slate-400">No orders yet.</p>
      ) : (
        <ul className="space-y-4">
          {groupOrders.map((order) => {
            const trucks = order.subOrders.flatMap((s) => s.trucks);
            const stats = truckStats(trucks);
            return (
              <li key={order.id}>
                <Link
                  href={`/track/${order.id}`}
                  className="card block transition hover:border-brand-300 hover:shadow-md"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">{order.name}</h2>
                      {formatDirection(order.origin, order.destination) && (
                        <p className="text-sm text-slate-600">
                          {formatDirection(order.origin, order.destination)}
                        </p>
                      )}
                      <p className="text-xs text-slate-400">
                        Opened {formatDate(order.openedAt)}
                        {order.arrivedAt ? ` · Arrived ${formatDate(order.arrivedAt)}` : ""}
                        {order.pol ? ` · POL: ${order.pol}` : ""}
                        {order.commodity ? ` · ${order.commodity}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="badge-slate">
                        {order.subOrders.length} sub-order{order.subOrders.length === 1 ? "" : "s"}
                        {" "}
                        ({order.subOrders.filter((s) => s.status === "OPEN").length} open)
                      </span>
                      <span className="badge-slate">{stats.total} trucks</span>
                      <span className={stats.driverPaid === stats.total && stats.total > 0 ? "badge-green" : "badge-amber"}>
                        Driver paid {stats.driverPaid}/{stats.total}
                      </span>
                      <span className={stats.customerPaid === stats.total && stats.total > 0 ? "badge-green" : "badge-amber"}>
                        Customer paid {stats.customerPaid}/{stats.total}
                      </span>
                    </div>
                  </div>
                  {order.statusText && (
                    <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                      {order.statusText}
                      <span className="ml-2 text-xs text-slate-400">
                        (updated {formatDateTime(order.statusUpdatedAt)})
                      </span>
                    </p>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
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
