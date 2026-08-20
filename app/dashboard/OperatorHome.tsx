import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { User } from "@prisma/client";
import { formatDate, formatDirection, truckStats } from "@/lib/stats";
import { LinkPanel } from "./LinkPanel";

export async function OperatorHome({ user }: { user: User }) {
  const links = await prisma.operatorLink.findMany({
    where: { operatorId: user.id },
    include: { consignee: true },
    orderBy: { createdAt: "desc" },
  });

  const consigneeIds = links.map((l) => l.consigneeId);

  const orders = consigneeIds.length
    ? await prisma.groupOrder.findMany({
        where: { ownerId: { in: consigneeIds } },
        include: { subOrders: { include: { trucks: true } } },
        orderBy: { createdAt: "desc" },
      })
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Orders to track</h1>
        <p className="text-sm text-slate-500">
          Orders from consignees linked to you. Update truck location and leave comments.
        </p>
      </div>

      <LinkPanel
        myCode={user.linkCode}
        counterpartLabel="consignee"
        links={links.map((l) => ({ linkId: l.id, email: l.consignee.email, createdAt: l.createdAt }))}
      />

      {orders.length === 0 ? (
        <p className="card text-center text-slate-400">
          No orders yet — link with a consignee above to see their orders here.
        </p>
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
