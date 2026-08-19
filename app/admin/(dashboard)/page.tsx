import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate, formatDateTime, formatDirection, truckStats } from "@/lib/stats";
import { createGroupOrderAction } from "@/lib/actions/group-orders";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const groupOrders = await prisma.groupOrder.findMany({
    include: { subOrders: { include: { trucks: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Orders</h1>
        <p className="text-sm text-slate-500">
          Manage group orders, sub-orders and trucks.
        </p>
      </div>

      <details className="card">
        <summary className="cursor-pointer font-semibold text-slate-800">
          + New group order
        </summary>
        <form action={createGroupOrderAction} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label">Name (required)</label>
            <input className="field-input" type="text" name="name" placeholder="e.g. SADAR26075" required />
          </div>
          <div>
            <label className="field-label">Opened date</label>
            <input className="field-input" type="date" name="openedAt" />
          </div>
          <div>
            <label className="field-label">Origin (from)</label>
            <input className="field-input" type="text" name="origin" placeholder="e.g. China" />
          </div>
          <div>
            <label className="field-label">Destination (to)</label>
            <input className="field-input" type="text" name="destination" placeholder="e.g. Iran" />
          </div>
          <div>
            <label className="field-label">Arrived date</label>
            <input className="field-input" type="date" name="arrivedAt" />
          </div>
          <div>
            <label className="field-label">POL (place of loading)</label>
            <input className="field-input" type="text" name="pol" />
          </div>
          <div>
            <label className="field-label">Commodity</label>
            <input className="field-input" type="text" name="commodity" />
          </div>
          <div>
            <label className="field-label">Volume</label>
            <input className="field-input" type="text" name="volumeInfo" placeholder="e.g. 8xFTL" />
          </div>
          <div>
            <label className="field-label">Factory load date</label>
            <input className="field-input" type="date" name="factoryLoadDate" />
          </div>
          <div className="sm:col-span-2">
            <label className="field-label">Status / current location</label>
            <input className="field-input" type="text" name="statusText" placeholder="e.g. Arrived in Bukhara" />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" className="btn-primary">
              Create order
            </button>
          </div>
        </form>
      </details>

      {groupOrders.length === 0 ? (
        <p className="card text-center text-slate-400">No orders yet.</p>
      ) : (
        <ul className="space-y-3">
          {groupOrders.map((order) => {
            const stats = truckStats(order.subOrders.flatMap((s) => s.trucks));
            return (
              <li key={order.id}>
                <Link href={`/admin/orders/${order.id}`} className="card block hover:border-brand-300 hover:shadow-md">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">{order.name}</h2>
                      <p className="text-xs text-slate-400">
                        Opened {formatDate(order.openedAt)} · {order.subOrders.length} sub-order(s)
                        {formatDirection(order.origin, order.destination) &&
                          ` · ${formatDirection(order.origin, order.destination)}`}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="badge-slate">{stats.total} trucks</span>
                      <span className={stats.driverPaid === stats.total && stats.total > 0 ? "badge-green" : "badge-amber"}>
                        Driver {stats.driverPaid}/{stats.total}
                      </span>
                      <span className={stats.customerPaid === stats.total && stats.total > 0 ? "badge-green" : "badge-amber"}>
                        Customer {stats.customerPaid}/{stats.total}
                      </span>
                    </div>
                  </div>
                  {order.statusText && (
                    <p className="mt-2 text-sm text-slate-600">
                      {order.statusText}{" "}
                      <span className="text-xs text-slate-400">
                        ({formatDateTime(order.statusUpdatedAt)})
                      </span>
                    </p>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
