"use client";

import { Ban } from "lucide-react";
import { formatDateTime, type TruckDto } from "@logistics/shared";
import { formToJson } from "@/lib/api";
import { useApiSubmit } from "@/lib/hooks";
import { ConfirmButton } from "@/components/ConfirmButton";

export function AdminTruckForms({
  orderId,
  subId,
  truck,
}: {
  orderId: string;
  subId: string;
  truck: TruckDto;
}) {
  const { submit, pending, error } = useApiSubmit();
  const base = `/api/admin/orders/${orderId}/sub-orders/${subId}/trucks/${truck.id}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <PaymentToggle
            label="Driver payment"
            status={truck.driverPaymentStatus}
            pending={pending}
            onChange={(value) =>
              submit(`${base}/payment`, { method: "PATCH", body: { field: "driverPaymentStatus", value } })
            }
          />
          <PaymentToggle
            label="Customer payment"
            status={truck.customerPaymentStatus}
            pending={pending}
            onChange={(value) =>
              submit(`${base}/payment`, { method: "PATCH", body: { field: "customerPaymentStatus", value } })
            }
          />
        </div>
        <ConfirmButton
          confirmText="Cancel this truck? It will stay in history. You can add a new truck or record a cargo transfer after that."
          disabled={pending || Boolean(truck.canceledAt)}
          onConfirm={() => submit(`${base}/cancel`, { method: "POST" })}
        >
          <Ban className="h-4 w-4" />
          Cancel truck
        </ConfirmButton>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(base, { method: "PATCH", body: formToJson(e.currentTarget) });
        }}
        className="grid grid-cols-1 gap-4 sm:grid-cols-3"
      >
        <Field name="plateNumber" label="Truck plate number" defaultValue={truck.plateNumber} />
        <Field name="trailerPlateNumber" label="Trailer plate number" defaultValue={truck.trailerPlateNumber} />
        <Field name="driverName" label="Driver name" defaultValue={truck.driverName} />
        <Field name="driverPhone" label="Driver phone" defaultValue={truck.driverPhone} />
        <Field name="lengthM" label="Length (m)" type="number" defaultValue={truck.lengthM} />
        <Field name="widthM" label="Width (m)" type="number" defaultValue={truck.widthM} />
        <Field name="heightM" label="Height (m)" type="number" defaultValue={truck.heightM} />
        <Field name="cargoWeight" label="Cargo weight (kg)" type="number" defaultValue={truck.cargoWeight} />
        <Field name="cargoDescription" label="Cargo description" defaultValue={truck.cargoDescription} />
        <div className="sm:col-span-3">
          <Field name="currentLocation" label="Current location" defaultValue={truck.currentLocation} />
          <p className="mt-1 text-xs text-slate-400">Last updated: {formatDateTime(truck.locationUpdatedAt)}</p>
        </div>
        <div className="sm:col-span-3">
          <button type="submit" className="btn-primary" disabled={pending}>
            {pending ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  name,
  label,
  type = "text",
  defaultValue,
}: {
  name: string;
  label: string;
  type?: string;
  defaultValue?: string | number | null;
}) {
  return (
    <div>
      <label className="field-label">{label}</label>
      <input
        className="field-input"
        type={type}
        step={type === "number" ? "0.01" : undefined}
        name={name}
        defaultValue={defaultValue ?? ""}
      />
    </div>
  );
}

function PaymentToggle({
  label,
  status,
  pending,
  onChange,
}: {
  label: string;
  status: "PAID" | "NOT_PAID";
  pending: boolean;
  onChange: (value: "PAID" | "NOT_PAID") => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
      <span className="text-sm font-medium text-slate-700">{label}:</span>
      <span className={status === "PAID" ? "badge-green" : "badge-amber"}>{status === "PAID" ? "Paid" : "Not paid"}</span>
      <button
        type="button"
        disabled={pending}
        className="text-xs text-brand-600 underline"
        onClick={() => onChange(status === "PAID" ? "NOT_PAID" : "PAID")}
      >
        {status === "PAID" ? "Mark not paid" : "Mark paid"}
      </button>
    </div>
  );
}
