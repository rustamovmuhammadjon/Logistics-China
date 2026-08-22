"use client";

import { Trash2 } from "lucide-react";
import { toDateInputValue, truckStats, type GroupOrderDto } from "@logistics/shared";
import { formToJson } from "@/lib/api";
import { useApiSubmit } from "@/lib/hooks";
import { ConfirmButton } from "@/components/ConfirmButton";
import { LocationBadge } from "@/components/LocationBadge";
import { OrderFields } from "@/components/OrderFields";

export function ConsigneeOrderDetail({ order }: { order: GroupOrderDto }) {
  const { submit, pending, error } = useApiSubmit();

  return (
    <div className="space-y-6">
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-900">{order.name}</h1>
          <ConfirmButton
            confirmText="Delete this whole order, including all sub-orders?"
            disabled={pending}
            onConfirm={() => submit(`/api/consignee/orders/${order.id}`, { method: "DELETE", redirectTo: "/dashboard" })}
          >
            <Trash2 className="h-4 w-4" />
            Delete order
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
        <LocationBadge statusText={order.statusText} updatedAt={order.statusUpdatedAt} />
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      <div className="card">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">New sub-order</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(`/api/consignee/orders/${order.id}/sub-orders`, { body: formToJson(e.currentTarget) });
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
          <ul className="space-y-3">
            {order.subOrders.map((sub) => {
              const stats = truckStats(sub.trucks);
              return (
                <li key={sub.id} className="card space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className={sub.status === "CLOSED" ? "badge-slate" : "badge-green"}>
                      {sub.status === "CLOSED" ? "Closed" : "Open"}
                    </span>
                    <span className="badge-slate">{stats.total} trucks (read-only)</span>
                  </div>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      submit(`/api/consignee/orders/${order.id}/sub-orders/${sub.id}`, {
                        method: "PATCH",
                        body: formToJson(e.currentTarget),
                      });
                    }}
                    className="grid grid-cols-1 gap-3 sm:grid-cols-4"
                  >
                    <div>
                      <label className="field-label">Name</label>
                      <input className="field-input" type="text" name="name" defaultValue={sub.name ?? ""} />
                    </div>
                    <div>
                      <label className="field-label">Opened date</label>
                      <input className="field-input" type="date" name="openedAt" defaultValue={toDateInputValue(sub.openedAt)} />
                    </div>
                    <div>
                      <label className="field-label">Arrived date</label>
                      <input className="field-input" type="date" name="arrivedAt" defaultValue={toDateInputValue(sub.arrivedAt)} />
                    </div>
                    <div className="flex items-end">
                      <button type="submit" className="btn-primary" disabled={pending}>
                        Save
                      </button>
                    </div>
                  </form>
                  <LocationBadge statusText={sub.statusText} updatedAt={sub.statusUpdatedAt} />
                  <ConfirmButton
                    confirmText="Delete this sub-order?"
                    disabled={pending}
                    onConfirm={() =>
                      submit(`/api/consignee/orders/${order.id}/sub-orders/${sub.id}`, { method: "DELETE" })
                    }
                  >
                    Delete sub-order
                  </ConfirmButton>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
