import type { Prisma } from "@prisma/client";
import { formatDate, truckStats } from "@/lib/stats";
import {
  deleteOwnedGroupOrderAction,
  updateOwnedGroupOrderAction,
  createOwnedSubOrderAction,
  updateOwnedSubOrderAction,
  deleteOwnedSubOrderAction,
} from "@/lib/actions/consignee";
import { toDateInputValue } from "@/lib/form-utils";
import { ConfirmSubmitButton } from "@/app/components/ConfirmSubmitButton";
import { LocationBadge } from "@/app/components/LocationBadge";

type OrderWithRelations = Prisma.GroupOrderGetPayload<{
  include: {
    comments: true;
    subOrders: {
      include: {
        comments: true;
        trucks: { include: { comments: true } };
      };
    };
  };
}>;

export function ConsigneeOrderDetail({ order }: { order: OrderWithRelations }) {
  const updateAction = updateOwnedGroupOrderAction.bind(null, order.id);
  const deleteAction = deleteOwnedGroupOrderAction.bind(null, order.id);
  const createSubAction = createOwnedSubOrderAction.bind(null, order.id);

  return (
    <div className="space-y-6">
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-900">{order.name}</h1>
          <form action={deleteAction}>
            <ConfirmSubmitButton confirmText="Delete this whole order, including all sub-orders?">
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
            <button type="submit" className="btn-primary">
              Save changes
            </button>
          </div>
        </form>

        <LocationBadge statusText={order.statusText} updatedAt={order.statusUpdatedAt} />
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
              const updateSub = updateOwnedSubOrderAction.bind(null, order.id, sub.id);
              const deleteSub = deleteOwnedSubOrderAction.bind(null, order.id, sub.id);
              return (
                <li key={sub.id} className="card space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className={sub.status === "CLOSED" ? "badge-slate" : "badge-green"}>
                      {sub.status === "CLOSED" ? "Closed" : "Open"}
                    </span>
                    <span className="badge-slate">{stats.total} trucks (read-only)</span>
                  </div>
                  <form action={updateSub} className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                    <div>
                      <label className="field-label">Name</label>
                      <input className="field-input" type="text" name="name" defaultValue={sub.name ?? ""} />
                    </div>
                    <div>
                      <label className="field-label">Opened date</label>
                      <input
                        className="field-input"
                        type="date"
                        name="openedAt"
                        defaultValue={toDateInputValue(sub.openedAt)}
                      />
                    </div>
                    <div>
                      <label className="field-label">Arrived date</label>
                      <input
                        className="field-input"
                        type="date"
                        name="arrivedAt"
                        defaultValue={toDateInputValue(sub.arrivedAt)}
                      />
                    </div>
                    <div className="flex items-end gap-2">
                      <button type="submit" className="btn-primary">
                        Save
                      </button>
                    </div>
                  </form>
                  <LocationBadge statusText={sub.statusText} updatedAt={sub.statusUpdatedAt} />
                  <form action={deleteSub}>
                    <ConfirmSubmitButton confirmText="Delete this sub-order?">
                      Delete sub-order
                    </ConfirmSubmitButton>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
