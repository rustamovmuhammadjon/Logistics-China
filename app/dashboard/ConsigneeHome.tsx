import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { User } from "@prisma/client";
import { formatDate, formatDirection, truckStats } from "@/lib/stats";
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My orders</h1>
          <p className="text-sm text-slate-500">Create and manage your own orders.</p>
        </div>
        <Link href="/dashboard/orders/new" className="btn-primary shrink-0">
          + New order
        </Link>
      </div>

      <LinkPanel
        myCode={user.linkCode}
        counterpartLabel="operator"
        links={links.map((l) => ({ linkId: l.id, email: l.operator.email, createdAt: l.createdAt }))}
      />

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
