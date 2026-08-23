"use client";

import { Trash2 } from "lucide-react";
import { formatDate, toDateInputValue, type CargoTransferDto, type SubOrderDto, type TruckDto } from "@logistics/shared";
import { formToJson } from "@/lib/api";
import { useApiSubmit } from "@/lib/hooks";
import { ConfirmButton } from "@/components/ConfirmButton";
import { DriverAssignPanel } from "@/components/DriverAssignPanel";
import { CargoTransferForm } from "@/components/CargoTransferForm";

export function AdminSubOrderForms({
  orderId,
  sub,
}: {
  orderId: string;
  sub: SubOrderDto & { trucks: (TruckDto & { transfersFrom?: CargoTransferDto[] })[] };
}) {
  const { submit, pending, error } = useApiSubmit();
  const transfers = sub.trucks.flatMap((t) => t.transfersFrom ?? []);

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <ConfirmButton
          confirmText="Delete this sub-order, including all its trucks?"
          disabled={pending}
          onConfirm={() =>
            submit(`/api/admin/orders/${orderId}/sub-orders/${sub.id}`, {
              method: "DELETE",
              redirectTo: `/admin/orders/${orderId}`,
            })
          }
        >
          <Trash2 className="h-4 w-4" />
          Delete sub-order
        </ConfirmButton>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(`/api/admin/orders/${orderId}/sub-orders/${sub.id}`, {
            method: "PATCH",
            body: formToJson(e.currentTarget),
          });
        }}
        className="grid grid-cols-1 gap-4 sm:grid-cols-3"
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
          <p className="mt-1 text-xs text-slate-400">Setting this closes the sub-order.</p>
        </div>
        <div className="sm:col-span-3">
          <label className="field-label">Current status / location</label>
          <input className="field-input" type="text" name="statusText" defaultValue={sub.statusText ?? ""} />
        </div>
        <div className="sm:col-span-3">
          <button type="submit" className="btn-primary" disabled={pending}>
            {pending ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">New truck</h2>
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const result = await submit<{ truck: { id: string } }>(
              `/api/admin/orders/${orderId}/sub-orders/${sub.id}/trucks`,
              { body: formToJson(e.currentTarget), refresh: false }
            );
            if (result?.truck) {
              window.location.href = `/admin/orders/${orderId}/suborders/${sub.id}/trucks/${result.truck.id}`;
            }
          }}
          className="grid grid-cols-1 gap-4 sm:grid-cols-3"
        >
          <Field name="plateNumber" label="Truck plate number" />
          <Field name="trailerPlateNumber" label="Trailer plate number" />
          <Field name="driverName" label="Driver name" />
          <Field name="driverPhone" label="Driver phone" />
          <Field name="lengthM" label="Length (m)" type="number" />
          <Field name="widthM" label="Width (m)" type="number" />
          <Field name="heightM" label="Height (m)" type="number" />
          <Field name="cargoWeight" label="Cargo weight (kg)" type="number" />
          <Field name="cargoDescription" label="Cargo description" />
          <div className="sm:col-span-3">
            <Field name="currentLocation" label="Current location" />
          </div>
          <div className="sm:col-span-3">
            <button type="submit" className="btn-primary" disabled={pending}>
              Add truck
            </button>
          </div>
        </form>
      </div>

      <DriverAssignPanel
        apiBase={`/api/admin/orders/${orderId}/sub-orders/${sub.id}`}
        trucks={sub.trucks}
      />

      <CargoTransferForm
        apiBase={`/api/admin/orders/${orderId}/sub-orders/${sub.id}`}
        trucks={sub.trucks}
        transfers={transfers}
        canDelete
      />
    </div>
  );
}

function Field({ name, label, type = "text" }: { name: string; label: string; type?: string }) {
  return (
    <div>
      <label className="field-label">{label}</label>
      <input className="field-input" type={type} step={type === "number" ? "0.01" : undefined} name={name} />
    </div>
  );
}
