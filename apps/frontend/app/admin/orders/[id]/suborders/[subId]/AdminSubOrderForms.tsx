"use client";

import { Ban, CheckCircle2 } from "lucide-react";
import { formatDate, isActiveTruck, toDateInputValue, type CargoTransferDto, type SubOrderDto, type TruckDto } from "@logistics/shared";
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
      <div className="flex flex-wrap justify-end gap-2">
        {sub.status === "OPEN" && (
          <ConfirmButton
            className="btn-primary"
            confirmText="Mark this sub-order as completed? The completed date will be set to today."
            disabled={pending}
            onConfirm={() =>
              submit(`/api/admin/orders/${orderId}/sub-orders/${sub.id}/complete`, {
                method: "POST",
              })
            }
          >
            <CheckCircle2 className="h-4 w-4" />
            Complete
          </ConfirmButton>
        )}
        <ConfirmButton
          confirmText="Cancel this sub-order? Other sub-orders in this order will stay as they are."
          disabled={pending || sub.status !== "OPEN"}
          onConfirm={() =>
            submit(`/api/admin/orders/${orderId}/sub-orders/${sub.id}/cancel`, {
              method: "POST",
            })
          }
        >
          <Ban className="h-4 w-4" />
          Cancel sub-order
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
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
      >
        <div>
          <label className="field-label">Name</label>
          <input className="field-input" type="text" name="name" defaultValue={sub.name ?? ""} />
        </div>
        <div>
          <label className="field-label">Opened date</label>
          <input className="field-input" type="date" name="openedAt" defaultValue={toDateInputValue(sub.openedAt)} />
        </div>
        {sub.status === "CLOSED" && (
          <p className="text-sm text-slate-500 sm:col-span-2">Completed {formatDate(sub.arrivedAt) || "—"}</p>
        )}
        <div className="sm:col-span-2">
          <button type="submit" className="btn-primary" disabled={pending}>
            {pending ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>

      {sub.status === "OPEN" && !sub.trucks.some(isActiveTruck) && (
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
      )}
      {sub.status === "OPEN" && sub.trucks.some(isActiveTruck) && (
        <p className="text-sm text-slate-400">
          This sub-order already has an active truck. Use cargo transfer to add another one, or cancel the current truck first.
        </p>
      )}

      {sub.status === "OPEN" && (
        <>
          <DriverAssignPanel
            apiBase={`/api/admin/orders/${orderId}/sub-orders/${sub.id}`}
            trucks={sub.trucks.filter(isActiveTruck)}
          />

          <CargoTransferForm
            apiBase={`/api/admin/orders/${orderId}/sub-orders/${sub.id}`}
            trucks={sub.trucks.filter(isActiveTruck)}
            transfers={transfers}
            canDelete
          />
        </>
      )}
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
