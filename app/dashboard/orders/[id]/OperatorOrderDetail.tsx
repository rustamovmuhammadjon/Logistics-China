import type { Prisma } from "@prisma/client";
import { formatDate, formatDateTime, formatDirection, truckStats } from "@/lib/stats";
import {
  updateOrderLocationAction,
  updateSubOrderLocationAction,
  updateTruckLocationAction,
} from "@/lib/actions/operator";
import { OperatorComments } from "./OperatorComments";

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

export function OperatorOrderDetail({ order }: { order: OrderWithRelations }) {
  const updateOrderLocation = updateOrderLocationAction.bind(null, order.id);
  const stats = truckStats(order.subOrders.flatMap((s) => s.trucks));

  return (
    <div className="space-y-6">
      <div className="card space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">{order.name}</h1>
            {formatDirection(order.origin, order.destination) && (
              <p className="text-sm text-slate-600">{formatDirection(order.origin, order.destination)}</p>
            )}
            <p className="text-xs text-slate-400">
              Opened {formatDate(order.openedAt)}
              {order.pol ? ` · POL: ${order.pol}` : ""}
              {order.commodity ? ` · ${order.commodity}` : ""}
            </p>
          </div>
          <span className="badge-slate">{stats.total} trucks</span>
        </div>

        <form action={updateOrderLocation} className="space-y-2">
          <label className="field-label">Current status / location</label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              className="field-input flex-1"
              type="text"
              name="statusText"
              defaultValue={order.statusText ?? ""}
              placeholder="e.g. Arrived in Bukhara"
            />
            <button type="submit" className="btn-primary shrink-0">
              Update
            </button>
          </div>
          <p className="text-xs text-slate-400">Last updated: {formatDateTime(order.statusUpdatedAt)}</p>
        </form>

        <OperatorComments
          groupOrderId={order.id}
          target={{ level: "group", groupOrderId: order.id }}
          comments={order.comments}
        />
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Sub-orders</h2>
        {order.subOrders.length === 0 ? (
          <p className="card text-center text-slate-400">No sub-orders yet.</p>
        ) : (
          <div className="space-y-4">
            {order.subOrders.map((sub) => {
              const updateSubLocation = updateSubOrderLocationAction.bind(null, order.id, sub.id);
              return (
              <details key={sub.id} className="card" open>
                <summary className="cursor-pointer list-none">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-slate-900">{sub.name || "Sub-order"}</span>
                    <span className={sub.status === "CLOSED" ? "badge-slate" : "badge-green"}>
                      {sub.status === "CLOSED" ? "Closed" : "Open"}
                    </span>
                  </div>
                </summary>

                <form action={updateSubLocation} className="mt-4 space-y-1">
                  <label className="field-label">Sub-order status / location</label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      className="field-input flex-1"
                      type="text"
                      name="statusText"
                      defaultValue={sub.statusText ?? ""}
                    />
                    <button type="submit" className="btn-primary shrink-0">
                      Update
                    </button>
                  </div>
                  <p className="text-xs text-slate-400">
                    Last updated: {formatDateTime(sub.statusUpdatedAt)}
                  </p>
                </form>

                <div className="mt-4">
                  <OperatorComments
                    groupOrderId={order.id}
                    target={{ level: "sub", groupOrderId: order.id, subOrderId: sub.id }}
                    comments={sub.comments}
                  />
                </div>

                <div className="mt-4 space-y-3">
                  {sub.trucks.length === 0 ? (
                    <p className="text-sm text-slate-400">No trucks yet.</p>
                  ) : (
                    sub.trucks.map((truck) => {
                      const updateLocation = updateTruckLocationAction.bind(null, order.id, truck.id);
                      return (
                        <div key={truck.id} className="rounded-lg border border-slate-200 p-4 space-y-3">
                          <div>
                            <p className="font-medium text-slate-900">
                              {truck.plateNumber || "Truck"}
                              {truck.trailerPlateNumber ? ` / ${truck.trailerPlateNumber}` : ""}
                            </p>
                            <p className="text-xs text-slate-400">
                              {truck.driverName ? `${truck.driverName} · ` : ""}
                              {truck.driverPhone || ""}
                            </p>
                          </div>

                          <form action={updateLocation} className="space-y-1">
                            <label className="field-label">Current location</label>
                            <div className="flex flex-col gap-2 sm:flex-row">
                              <input
                                className="field-input flex-1"
                                type="text"
                                name="currentLocation"
                                defaultValue={truck.currentLocation ?? ""}
                              />
                              <button type="submit" className="btn-primary shrink-0">
                                Update
                              </button>
                            </div>
                            <p className="text-xs text-slate-400">
                              Last updated: {formatDateTime(truck.locationUpdatedAt)}
                            </p>
                          </form>

                          <OperatorComments
                            groupOrderId={order.id}
                            target={{
                              level: "truck",
                              groupOrderId: order.id,
                              subOrderId: sub.id,
                              truckId: truck.id,
                            }}
                            comments={truck.comments}
                          />
                        </div>
                      );
                    })
                  )}
                </div>
              </details>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
