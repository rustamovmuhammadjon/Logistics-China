import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatDate, formatDirection, truckStats } from "@/lib/stats";
import {
  deleteGroupOrderAction,
  updateGroupOrderAction,
} from "@/lib/actions/group-orders";
import { createSubOrderAction } from "@/lib/actions/sub-orders";
import { toDateInputValue } from "@/lib/form-utils";
import { CommentsSection } from "@/app/components/CommentsSection";
import { ConfirmSubmitButton } from "@/app/components/ConfirmSubmitButton";

export const dynamic = "force-dynamic";

export default async function GroupOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const order = await prisma.groupOrder.findUnique({
    where: { id },
    include: {
      comments: { orderBy: { createdAt: "desc" } },
      subOrders: {
        orderBy: { createdAt: "asc" },
        include: { trucks: true },
      },
    },
  });

  if (!order) notFound();

  const updateAction = updateGroupOrderAction.bind(null, order.id);
  const deleteAction = deleteGroupOrderAction.bind(null, order.id);
  const createSubAction = createSubOrderAction.bind(null, order.id);

  return (
    <div className="space-y-6">
      <Link href="/admin" className="text-sm text-brand-600 hover:underline">
        ← All orders
      </Link>

      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">{order.name}</h1>
            {formatDirection(order.origin, order.destination) && (
              <p className="text-sm text-slate-500">{formatDirection(order.origin, order.destination)}</p>
            )}
          </div>
          <form action={deleteAction}>
            <ConfirmSubmitButton confirmText="Delete this whole order, including all sub-orders and trucks?">
              Delete order
            </ConfirmSubmitButton>
          </form>
        </div>

        <form action={updateAction} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label">Name (required)</label>
            <input className="field-input" type="text" name="name" defaultValue={order.name} required />
          </div>
          <div>
            <label className="field-label">Opened date</label>
            <input
              className="field-input"
              type="date"
              name="openedAt"
              defaultValue={toDateInputValue(order.openedAt)}
            />
          </div>
          <div>
            <label className="field-label">Origin (from)</label>
            <input className="field-input" type="text" name="origin" defaultValue={order.origin ?? ""} />
          </div>
          <div>
            <label className="field-label">Destination (to)</label>
            <input
              className="field-input"
              type="text"
              name="destination"
              defaultValue={order.destination ?? ""}
            />
          </div>
          <div>
            <label className="field-label">Arrived date</label>
            <input
              className="field-input"
              type="date"
              name="arrivedAt"
              defaultValue={toDateInputValue(order.arrivedAt)}
            />
          </div>
          <div>
            <label className="field-label">POL (place of loading)</label>
            <input className="field-input" type="text" name="pol" defaultValue={order.pol ?? ""} />
          </div>
          <div>
            <label className="field-label">Commodity</label>
            <input
              className="field-input"
              type="text"
              name="commodity"
              defaultValue={order.commodity ?? ""}
            />
          </div>
          <div>
            <label className="field-label">Volume</label>
            <input
              className="field-input"
              type="text"
              name="volumeInfo"
              defaultValue={order.volumeInfo ?? ""}
            />
          </div>
          <div>
            <label className="field-label">Factory load date</label>
            <input
              className="field-input"
              type="date"
              name="factoryLoadDate"
              defaultValue={toDateInputValue(order.factoryLoadDate)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="field-label">Status / current location</label>
            <input
              className="field-input"
              type="text"
              name="statusText"
              defaultValue={order.statusText ?? ""}
            />
            <p className="mt-1 text-xs text-slate-400">
              Last updated: {formatDate(order.statusUpdatedAt)}
            </p>
          </div>
          <div className="sm:col-span-2">
            <button type="submit" className="btn-primary">
              Save changes
            </button>
          </div>
        </form>

        <CommentsSection target={{ level: "group", groupOrderId: order.id }} comments={order.comments} />
      </div>

      <div className="card">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">New sub-order</h2>
        <form action={createSubAction} className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div>
            <label className="field-label">Name</label>
            <input className="field-input" type="text" name="name" placeholder="optional" />
          </div>
          <div>
            <label className="field-label">Opened date</label>
            <input className="field-input" type="date" name="openedAt" />
          </div>
          <div>
            <label className="field-label">Arrived date</label>
            <input className="field-input" type="date" name="arrivedAt" />
            <p className="mt-1 text-xs text-slate-400">Setting this closes the sub-order.</p>
          </div>
          <div className="flex items-end">
            <button type="submit" className="btn-primary w-full">
              Add sub-order
            </button>
          </div>
        </form>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Sub-orders</h2>
        {order.subOrders.length === 0 ? (
          <p className="card text-center text-slate-400">No sub-orders yet.</p>
        ) : (
          <ul className="space-y-3">
            {order.subOrders.map((sub) => {
              const stats = truckStats(sub.trucks);
              return (
                <li key={sub.id}>
                  <Link
                    href={`/admin/orders/${order.id}/suborders/${sub.id}`}
                    className="card block hover:border-brand-300 hover:shadow-md"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="font-medium text-slate-900">{sub.name || "Sub-order"}</span>
                        <span className="ml-2 text-xs text-slate-400">
                          Opened {formatDate(sub.openedAt)}
                          {sub.arrivedAt ? ` · Arrived ${formatDate(sub.arrivedAt)}` : ""}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className={sub.status === "CLOSED" ? "badge-slate" : "badge-green"}>
                          {sub.status === "CLOSED" ? "Closed" : "Open"}
                        </span>
                        <span className="badge-slate">{stats.total} trucks</span>
                        <span className={stats.driverPaid === stats.total && stats.total > 0 ? "badge-green" : "badge-amber"}>
                          Driver {stats.driverPaid}/{stats.total}
                        </span>
                        <span className={stats.customerPaid === stats.total && stats.total > 0 ? "badge-green" : "badge-amber"}>
                          Customer {stats.customerPaid}/{stats.total}
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
