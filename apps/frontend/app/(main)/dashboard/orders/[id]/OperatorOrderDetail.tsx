"use client";

import { Trash2 } from "lucide-react";
import { formatDate, formatDateTime, formatDirection, truckStats, type CommentDto, type GroupOrderDto } from "@logistics/shared";
import { formToJson } from "@/lib/api";
import { useApiSubmit } from "@/lib/hooks";
import { ConfirmButton } from "@/components/ConfirmButton";
import { TruckFields } from "@/components/TruckFields";

export function OperatorOrderDetail({ order }: { order: GroupOrderDto }) {
  const { submit, pending, error } = useApiSubmit();
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

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(`/api/operator/orders/${order.id}/location`, { method: "PATCH", body: formToJson(e.currentTarget) });
          }}
          className="space-y-2"
        >
          <label className="field-label">Current status / location</label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              className="field-input flex-1"
              type="text"
              name="statusText"
              defaultValue={order.statusText ?? ""}
              placeholder="e.g. Arrived in Bukhara"
            />
            <button type="submit" className="btn-primary shrink-0" disabled={pending}>
              {pending ? "Updating…" : "Update"}
            </button>
          </div>
          <p className="text-xs text-slate-400">Last updated: {formatDateTime(order.statusUpdatedAt)}</p>
        </form>
        <OperatorComments groupOrderId={order.id} level="group" comments={order.comments ?? []} />
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      <div className="card">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">New sub-order</h2>
        <p className="mb-3 text-xs text-slate-400">Add a sub-order first if this order has none, then add trucks to it.</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(`/api/operator/orders/${order.id}/sub-orders`, { body: formToJson(e.currentTarget) });
            e.currentTarget.reset();
          }}
          className="grid grid-cols-1 gap-4 sm:grid-cols-4"
        >
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
            <button type="submit" className="btn-primary w-full" disabled={pending}>
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
          <div className="space-y-4">
            {order.subOrders.map((sub) => (
              <details key={sub.id} className="card" open>
                <summary className="cursor-pointer list-none">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-slate-900">{sub.name || "Sub-order"}</span>
                    <span className={sub.status === "CLOSED" ? "badge-slate" : "badge-green"}>
                      {sub.status === "CLOSED" ? "Closed" : "Open"}
                    </span>
                  </div>
                </summary>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    submit(`/api/operator/orders/${order.id}/sub-orders/${sub.id}/location`, {
                      method: "PATCH",
                      body: formToJson(e.currentTarget),
                    });
                  }}
                  className="mt-4 space-y-1"
                >
                  <label className="field-label">Sub-order status / location</label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input className="field-input flex-1" type="text" name="statusText" defaultValue={sub.statusText ?? ""} />
                    <button type="submit" className="btn-primary shrink-0" disabled={pending}>
                      Update
                    </button>
                  </div>
                </form>

                <div className="mt-4">
                  <OperatorComments
                    groupOrderId={order.id}
                    level="sub"
                    subOrderId={sub.id}
                    comments={sub.comments ?? []}
                  />
                </div>

                <div className="mt-4 space-y-3">
                  <h3 className="text-sm font-semibold text-slate-800">New truck</h3>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      submit(`/api/operator/orders/${order.id}/sub-orders/${sub.id}/trucks`, {
                        body: formToJson(e.currentTarget),
                      });
                      e.currentTarget.reset();
                    }}
                    className="rounded-xl border border-dashed border-slate-200 p-4"
                  >
                    <TruckFields />
                    <button type="submit" className="btn-primary mt-3" disabled={pending}>
                      Add truck
                    </button>
                  </form>
                  {sub.trucks.map((truck) => (
                    <div key={truck.id} className="space-y-3 rounded-xl border border-slate-200 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
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
                        <ConfirmButton
                          confirmText="Delete this truck?"
                          disabled={pending}
                          onConfirm={() =>
                            submit(`/api/operator/orders/${order.id}/sub-orders/${sub.id}/trucks/${truck.id}`, {
                              method: "DELETE",
                            })
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </ConfirmButton>
                      </div>
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          submit(`/api/operator/orders/${order.id}/sub-orders/${sub.id}/trucks/${truck.id}`, {
                            method: "PATCH",
                            body: formToJson(e.currentTarget),
                          });
                        }}
                      >
                        <TruckFields truck={truck} />
                        <p className="mt-1 text-xs text-slate-400">Last location update: {formatDateTime(truck.locationUpdatedAt)}</p>
                        <button type="submit" className="btn-primary mt-3" disabled={pending}>
                          Save truck
                        </button>
                      </form>
                      <OperatorComments
                        groupOrderId={order.id}
                        level="truck"
                        subOrderId={sub.id}
                        truckId={truck.id}
                        comments={truck.comments ?? []}
                      />
                    </div>
                  ))}
                </div>
              </details>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function OperatorComments({
  groupOrderId,
  level,
  subOrderId,
  truckId,
  comments,
}: {
  groupOrderId: string;
  level: "group" | "sub" | "truck";
  subOrderId?: string;
  truckId?: string;
  comments: CommentDto[];
}) {
  const { submit, pending } = useApiSubmit();

  return (
    <div className="space-y-2 border-t border-slate-100 pt-3">
      {comments.map((c) => (
        <p key={c.id} className="text-sm text-slate-700">
          {c.text}{" "}
          <span className="text-xs text-slate-400">
            ({c.author ? `${c.author}, ` : ""}
            {formatDateTime(c.createdAt)})
          </span>
        </p>
      ))}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit("/api/operator/comments", {
            body: { ...formToJson(e.currentTarget), groupOrderId, level, subOrderId, truckId },
          });
          e.currentTarget.reset();
        }}
        className="flex gap-2"
      >
        <input className="field-input flex-1" type="text" name="text" placeholder="Add a comment..." required />
        <button type="submit" className="btn-secondary shrink-0" disabled={pending}>
          Add
        </button>
      </form>
    </div>
  );
}
