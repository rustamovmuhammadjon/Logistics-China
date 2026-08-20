import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { User } from "@prisma/client";
import { formatDate, formatDirection, truckStats } from "@/lib/stats";
import { createOwnedGroupOrderAction } from "@/lib/actions/consignee";
import { LinkPanel } from "./LinkPanel";

export async function ConsigneeHome({ user }: { user: User }) {
  const [orders, links] = await Promise.all([
    prisma.groupOrder.findMany({
      where: { ownerId: user.id },
      include: { subOrders: { include: { trucks: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.operatorLink.findMany({
      where: { consigneeId: user.id },
      include: { operator: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My orders</h1>
        <p className="text-sm text-slate-500">Create and manage your own orders.</p>
      </div>

      <LinkPanel
        myCode={user.linkCode}
        counterpartLabel="operator"
        links={links.map((l) => ({ linkId: l.id, email: l.operator.email, createdAt: l.createdAt }))}
      />

      <details className="card">
        <summary className="cursor-pointer font-semibold text-slate-800">+ New order</summary>
        <form
          action={createOwnedGroupOrderAction}
          className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          <div>
            <label className="field-label">Name (required)</label>
            <input className="field-input" type="text" name="name" required />
          </div>
          <div>
            <label className="field-label">Opened date</label>
            <input className="field-input" type="date" name="openedAt" />
          </div>
          <div>
            <label className="field-label">Origin (from)</label>
            <input className="field-input" type="text" name="origin" />
          </div>
          <div>
            <label className="field-label">Destination (to)</label>
            <input className="field-input" type="text" name="destination" />
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
            <button type="submit" className="btn-primary">
              Create order
            </button>
          </div>
        </form>
      </details>

      {orders.length === 0 ? (
        <p className="card text-center text-slate-400">You haven't created any orders yet.</p>
      ) : (
        <ul className="space-y-3">
          {orders.map((order) => {
            const stats = truckStats(order.subOrders.flatMap((s) => s.trucks));
            return (
              <li key={order.id}>
                <Link
                  href={`/dashboard/orders/${order.id}`}
                  className="card block hover:border-brand-300 hover:shadow-md"
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
