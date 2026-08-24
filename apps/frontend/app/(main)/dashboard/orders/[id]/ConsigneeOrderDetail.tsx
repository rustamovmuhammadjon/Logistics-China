"use client";

import { Ban, CheckCircle2 } from "lucide-react";
import { formatDate, subOrderStatusLabel, truckStats, type GroupOrderDto } from "@logistics/shared";
import { formToJson } from "@/lib/api";
import { useApiSubmit } from "@/lib/hooks";
import { ConfirmButton } from "@/components/ConfirmButton";
import { OrderFields } from "@/components/OrderFields";

export function ConsigneeOrderDetail({ order }: { order: GroupOrderDto }) {
  const { submit, pending, error } = useApiSubmit();

  return (
    <div className="space-y-6">
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-900">{order.name}</h1>
          <ConfirmButton
            confirmText="Cancel this whole order? It will move to the Cancelled page and leave monitoring."
            disabled={pending}
            onConfirm={() => submit(`/api/consignee/orders/${order.id}/cancel`, { method: "POST", redirectTo: "/cancelled" })}
          >
            <Ban className="h-4 w-4" />
            Cancel order
          </ConfirmButton>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(`/api/consignee/orders/${order.id}`, { method: "PATCH", body: formToJson(e.currentTarget) });
          }}
        >
          <OrderFields order={order} />
          <button type="submit" className="btn-primary mt-4" disabled={pending}>
            {pending ? "Saving…" : "Save changes"}
          </button>
        </form>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      {!order.canceledAt && (
        <div className="card">
          <h2 className="mb-3 text-lg font-semibold text-slate-900">New sub-order</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(`/api/consignee/orders/${order.id}/sub-orders`, { body: formToJson(e.currentTarget) });
              e.currentTarget.reset();
            }}
            className="grid grid-cols-1 gap-4 sm:grid-cols-3"
          >
            <div>
              <label className="field-label">Name</label>
              <input className="field-input" type="text" name="name" placeholder="optional" />
            </div>
            <div>
              <label className="field-label">Opened date</label>
              <input className="field-input" type="date" name="openedAt" />
            </div>
            <div className="flex items-end">
              <button type="submit" className="btn-primary w-full" disabled={pending}>
                Add sub-order
              </button>
            </div>
          </form>
        </div>
      )}

      <div>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Sub-orders</h2>
        {order.subOrders.length === 0 ? (
          <p className="card text-center text-slate-400">No sub-orders yet.</p>
        ) : (
          <ul className="space-y-3">
            {order.subOrders.map((sub) => {
              const stats = truckStats(sub.trucks);
              return (
                <li key={sub.id} className="card space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span
                      className={
                        sub.status === "CANCELED" ? "badge-red" : sub.status === "CLOSED" ? "badge-slate" : "badge-green"
                      }
                    >
                      {subOrderStatusLabel(sub.status)}
                    </span>
                    <span className="badge-slate">{stats.total} trucks (read-only)</span>
                  </div>

                  {sub.status === "CANCELED" ? (
                    <p className="font-medium text-slate-900">{sub.name || "Sub-order"}</p>
                  ) : (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        submit(`/api/consignee/orders/${order.id}/sub-orders/${sub.id}`, {
                          method: "PATCH",
                          body: formToJson(e.currentTarget),
                        });
                      }}
                      className="flex flex-col gap-3 sm:flex-row sm:items-end"
                    >
                      <div className="flex-1">
                        <label className="field-label">Name</label>
                        <input className="field-input" type="text" name="name" defaultValue={sub.name ?? ""} />
                      </div>
                      <button type="submit" className="btn-primary" disabled={pending}>
                        Save
                      </button>
                    </form>
                  )}

                  <p className="text-xs text-slate-400">
                    Opened {formatDate(sub.openedAt) || "—"}
                    {sub.status === "CLOSED" && sub.arrivedAt ? ` · Completed ${formatDate(sub.arrivedAt)}` : ""}
                  </p>

                  {sub.status === "OPEN" && !order.canceledAt && (
                    <div className="flex flex-wrap gap-2">
                      <ConfirmButton
                        className="btn-primary"
                        confirmText="Mark this sub-order as completed? The completed date will be set to today."
                        disabled={pending}
                        onConfirm={() =>
                          submit(`/api/consignee/orders/${order.id}/sub-orders/${sub.id}/complete`, { method: "POST" })
                        }
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Complete
                      </ConfirmButton>
                      <ConfirmButton
                        confirmText="Cancel this sub-order? Other sub-orders in this order will stay as they are."
                        disabled={pending}
                        onConfirm={() =>
                          submit(`/api/consignee/orders/${order.id}/sub-orders/${sub.id}/cancel`, { method: "POST" })
                        }
                      >
                        Cancel sub-order
                      </ConfirmButton>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
