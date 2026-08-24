"use client";

import { Ban } from "lucide-react";
import type { GroupOrderDto } from "@logistics/shared";
import { formToJson } from "@/lib/api";
import { useApiSubmit } from "@/lib/hooks";
import { ConfirmButton } from "@/components/ConfirmButton";
import { OrderFields } from "@/components/OrderFields";

export function AdminOrderForms({ order }: { order: GroupOrderDto }) {
  const { submit, pending, error } = useApiSubmit();

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <ConfirmButton
          confirmText="Cancel this whole order? It will move to the Cancelled page and leave monitoring."
          disabled={pending}
          onConfirm={() => submit(`/api/admin/orders/${order.id}/cancel`, { method: "POST", redirectTo: "/cancelled" })}
        >
          <Ban className="h-4 w-4" />
          Cancel order
        </ConfirmButton>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(`/api/admin/orders/${order.id}`, { method: "PATCH", body: formToJson(e.currentTarget) });
        }}
      >
        <OrderFields order={order} />
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <button type="submit" className="btn-primary mt-4" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </button>
      </form>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">New sub-order</h2>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const result = await submit<{ subOrder: { id: string } }>(`/api/admin/orders/${order.id}/sub-orders`, {
              body: formToJson(e.currentTarget),
              refresh: false,
            });
            if (result?.subOrder) {
              window.location.href = `/admin/orders/${order.id}/suborders/${result.subOrder.id}`;
            }
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
    </div>
  );
}
