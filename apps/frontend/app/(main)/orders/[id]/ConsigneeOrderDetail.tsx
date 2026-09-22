"use client";

import { Ban, CheckCircle2 } from "lucide-react";
import {
  formatDate,
  formatDateTime,
  isGroupOrderLocked,
  subOrderStatusLabel,
  truckStats,
  type CommentDto,
  type GroupOrderDto,
} from "@logistics/shared";
import { formToJson } from "@/lib/api";
import { useApiSubmit } from "@/lib/hooks";
import { ConfirmButton } from "@/components/ConfirmButton";
import { OrderFields } from "@/components/OrderFields";
import { SubOrderLocation, TruckSequence, transferHistory } from "@/components/TruckReadout";
import { CargoTransferForm } from "@/components/CargoTransferForm";

export function ConsigneeOrderDetail({
  order,
  canWrite,
  readOnlyReason,
}: {
  order: GroupOrderDto;
  canWrite: boolean;
  readOnlyReason?: string;
}) {
  const { submit, pending, error } = useApiSubmit();
  const locked = isGroupOrderLocked(order);
  const editable = canWrite && !locked;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-900">{order.name}</h1>
          {editable && (
            <ConfirmButton
              confirmText="Cancel this whole order? It will move to the Cancelled page and leave monitoring."
              disabled={pending}
              onConfirm={() => submit(`/api/consignee/orders/${order.id}/cancel`, { method: "POST", redirectTo: "/cancelled" })}
            >
              <Ban className="h-4 w-4" />
              Cancel order
            </ConfirmButton>
          )}
        </div>

        {locked && (
          <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
            This order is {order.canceledAt ? "cancelled" : "completed"} and cannot be changed.
          </p>
        )}
        {!locked && !canWrite && readOnlyReason && (
          <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">{readOnlyReason}</p>
        )}

        {order.lastEditedByEmail && (
          <p className="text-xs text-slate-400">
            Last edited by {order.lastEditedByEmail} · {formatDateTime(order.lastEditedAt)}
          </p>
        )}

        {!editable ? (
          <OrderFields order={order} readOnly />
        ) : (
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
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      {editable && (
        <details className="card p-4">
          <summary className="cursor-pointer list-none text-sm font-semibold text-slate-900 marker:content-none">
            + New sub-order
          </summary>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(`/api/consignee/orders/${order.id}/sub-orders`, { body: formToJson(e.currentTarget) });
              e.currentTarget.reset();
            }}
            className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3"
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
        </details>
      )}

      <div>
        <h2 className="mb-2 text-lg font-semibold text-slate-900">Sub-orders</h2>
        {order.subOrders.length === 0 ? (
          <p className="card text-center text-slate-400">No sub-orders yet.</p>
        ) : (
          <div className="space-y-2">
            {order.subOrders.map((sub) => {
              const stats = truckStats(sub.trucks);
              const subEditable = editable && sub.status === "OPEN";
              return (
                <details key={sub.id} className="card p-4" open={order.subOrders.length === 1}>
                  <summary className="cursor-pointer list-none">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="font-medium text-slate-900">{sub.name || "Sub-order"}</span>
                        <p className="text-xs text-slate-400">
                          Opened {formatDate(sub.openedAt) || "—"}
                          {sub.factoryLoadDate ? ` · FLD ${formatDate(sub.factoryLoadDate)}` : ""}
                          {sub.status === "CLOSED" && sub.arrivedAt ? ` · Completed ${formatDate(sub.arrivedAt)}` : ""}
                          {` · ${stats.total} truck${stats.total === 1 ? "" : "s"}`}
                        </p>
                      </div>
                      <span
                        className={
                          sub.status === "CANCELED" ? "badge-red" : sub.status === "CLOSED" ? "badge-slate" : "badge-green"
                        }
                      >
                        {subOrderStatusLabel(sub.status)}
                      </span>
                    </div>
                  </summary>

                  <div className="mt-3 space-y-3">
                    {subEditable && (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          submit(`/api/consignee/orders/${order.id}/sub-orders/${sub.id}`, {
                            method: "PATCH",
                            body: formToJson(e.currentTarget),
                          });
                        }}
                        className="flex flex-col gap-2 sm:flex-row sm:items-end"
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

                    {sub.lastEditedByEmail && (
                      <p className="text-xs text-slate-400">
                        Last edited by {sub.lastEditedByEmail} · {formatDateTime(sub.lastEditedAt)}
                      </p>
                    )}

                    <SubOrderLocation trucks={sub.trucks} />

                    {sub.comments && sub.comments.length > 0 && (
                      <ul className="space-y-1.5">
                        {sub.comments.map((comment: CommentDto) => (
                          <li key={comment.id} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
                            <p className="whitespace-pre-wrap text-slate-800">{comment.text}</p>
                            <p className="mt-1 text-xs text-slate-400">
                              {comment.author ? `${comment.author} · ` : ""}
                              {formatDateTime(comment.createdAt)}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}

                    <TruckSequence trucks={sub.trucks} />
                    <CargoTransferForm
                      apiBase={`/api/consignee/orders/${order.id}/sub-orders/${sub.id}`}
                      trucks={[]}
                      transfers={transferHistory(sub.trucks)}
                      readOnly
                    />

                    {sub.status === "OPEN" && editable && (
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
