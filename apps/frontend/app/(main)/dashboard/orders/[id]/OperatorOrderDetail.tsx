"use client";

import { Ban } from "lucide-react";
import {
  formatDate,
  formatDateTime,
  formatDirection,
  isActiveTruck,
  isGroupOrderLocked,
  subOrderStatusLabel,
  truckStats,
  type CommentDto,
  type GroupOrderDto,
} from "@logistics/shared";
import { formToJson } from "@/lib/api";
import { useApiSubmit } from "@/lib/hooks";
import { ConfirmButton } from "@/components/ConfirmButton";
import { TruckFields } from "@/components/TruckFields";
import { DriverAssignPanel } from "@/components/DriverAssignPanel";
import { CargoTransferForm } from "@/components/CargoTransferForm";
import { TruckEditorCard } from "@/components/TruckEditorCard";
import { SubOrderLocation, transferHistory } from "@/components/TruckReadout";

export function OperatorOrderDetail({ order }: { order: GroupOrderDto }) {
  const { submit, pending, error } = useApiSubmit();
  const stats = truckStats(order.subOrders.flatMap((s) => s.trucks));
  const locked = isGroupOrderLocked(order);

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
        {locked && (
          <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
            This order is {order.canceledAt ? "cancelled" : "completed"} and cannot be changed.
          </p>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Sub-orders</h2>
        {order.subOrders.length === 0 ? (
          <p className="card text-center text-slate-400">No sub-orders yet. The consignee needs to add a sub-order first.</p>
        ) : (
          <div className="space-y-4">
            {order.subOrders.map((sub) => {
              const canMutate = sub.status === "OPEN" && !locked;
              return (
                <details key={sub.id} className="card" open>
                  <summary className="cursor-pointer list-none">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="font-semibold text-slate-900">{sub.name || "Sub-order"}</span>
                        <p className="text-xs text-slate-400">
                          Opened {formatDate(sub.openedAt) || "—"}
                          {sub.factoryLoadDate ? ` · FLD ${formatDate(sub.factoryLoadDate)}` : ""}
                          {sub.status === "CLOSED" && sub.arrivedAt ? ` · Completed ${formatDate(sub.arrivedAt)}` : ""}
                        </p>
                      </div>
                      <span
                        className={
                          sub.status === "CANCELED"
                            ? "badge-red"
                            : sub.status === "CLOSED"
                              ? "badge-slate"
                              : "badge-green"
                        }
                      >
                        {subOrderStatusLabel(sub.status)}
                      </span>
                    </div>
                  </summary>

                  <div className="mt-4">
                    <SubOrderLocation trucks={sub.trucks} />
                  </div>

                  <div className="mt-4">
                    <OperatorComments
                      groupOrderId={order.id}
                      subOrderId={sub.id}
                      comments={sub.comments ?? []}
                      locked={!canMutate}
                    />
                  </div>

                  <div className="mt-4 space-y-3">
                    {canMutate && !sub.trucks.some(isActiveTruck) && (
                      <>
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
                      </>
                    )}
                    {canMutate && sub.trucks.some(isActiveTruck) && (
                      <p className="text-xs text-slate-400">
                        This sub-order already has a current truck. Use cargo transfer to add another one, or cancel the
                        current truck first.
                      </p>
                    )}
                    {sub.trucks.map((truck, index) => (
                      <TruckEditorCard
                        key={truck.id}
                        truck={truck}
                        index={index}
                        total={sub.trucks.length}
                        locked={!canMutate}
                        patchUrl={`/api/operator/orders/${order.id}/sub-orders/${sub.id}/trucks/${truck.id}`}
                        cancelUrl={`/api/operator/orders/${order.id}/sub-orders/${sub.id}/trucks/${truck.id}/cancel`}
                      />
                    ))}
                    {canMutate && (
                      <>
                        <DriverAssignPanel
                          apiBase={`/api/operator/orders/${order.id}/sub-orders/${sub.id}`}
                          trucks={sub.trucks.filter(isActiveTruck)}
                        />
                        <CargoTransferForm
                          apiBase={`/api/operator/orders/${order.id}/sub-orders/${sub.id}`}
                          trucks={sub.trucks.filter(isActiveTruck)}
                          transfers={transferHistory(sub.trucks)}
                        />
                      </>
                    )}
                    {!canMutate && (
                      <CargoTransferForm
                        apiBase={`/api/operator/orders/${order.id}/sub-orders/${sub.id}`}
                        trucks={[]}
                        transfers={transferHistory(sub.trucks)}
                        readOnly
                      />
                    )}
                    {canMutate && (
                      <ConfirmButton
                        confirmText="Cancel this sub-order? Other sub-orders in this order will stay as they are."
                        disabled={pending}
                        onConfirm={() =>
                          submit(`/api/operator/orders/${order.id}/sub-orders/${sub.id}/cancel`, { method: "POST" })
                        }
                      >
                        <Ban className="h-4 w-4" />
                        Cancel sub-order
                      </ConfirmButton>
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

function OperatorComments({
  groupOrderId,
  subOrderId,
  comments,
  locked,
}: {
  groupOrderId: string;
  subOrderId: string;
  comments: CommentDto[];
  locked: boolean;
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
      {!locked && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit("/api/operator/comments", {
              body: { ...formToJson(e.currentTarget), groupOrderId, level: "sub", subOrderId },
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
      )}
    </div>
  );
}
