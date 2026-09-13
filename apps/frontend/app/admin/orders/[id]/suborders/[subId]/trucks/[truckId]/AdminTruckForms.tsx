"use client";

import { Ban } from "lucide-react";
import { formatDateTime, hasTransferredOut, type TruckDto } from "@logistics/shared";
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
  const frozen = Boolean(truck.canceledAt) || hasTransferredOut(truck);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <ConfirmButton
          confirmText="Cancel this truck? It will stay in history. You can add a new truck or record a cargo transfer after that."
          disabled={pending || frozen}
          onConfirm={() => submit(`${base}/cancel`, { method: "POST" })}
        >
          <Ban className="h-4 w-4" />
          Cancel truck
        </ConfirmButton>
      </div>

      {frozen && (
        <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
          {truck.canceledAt
            ? "This truck is cancelled. Details are read-only."
            : "This truck already transferred cargo. Details are read-only."}
        </p>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (frozen) return;
          submit(base, { method: "PATCH", body: formToJson(e.currentTarget) });
        }}
        className="grid grid-cols-1 gap-4 sm:grid-cols-3"
      >
        <Field name="plateNumber" label="Truck plate number" defaultValue={truck.plateNumber} readOnly={frozen} />
        <Field name="trailerPlateNumber" label="Trailer plate number" defaultValue={truck.trailerPlateNumber} readOnly={frozen} />
        <Field name="country" label="Country" defaultValue={truck.country} readOnly={frozen} />
        <Field name="driverName" label="Driver name" defaultValue={truck.driverName} readOnly={frozen} />
        <Field name="driverPhone" label="Driver phone" defaultValue={truck.driverPhone} readOnly={frozen} />
        <Field name="lengthM" label="Length (m)" type="number" defaultValue={truck.lengthM} readOnly={frozen} />
        <Field name="widthM" label="Width (m)" type="number" defaultValue={truck.widthM} readOnly={frozen} />
        <Field name="heightM" label="Height (m)" type="number" defaultValue={truck.heightM} readOnly={frozen} />
        <Field name="cargoWeight" label="Gross weight (tons)" type="number" defaultValue={truck.cargoWeight} readOnly={frozen} />
        <div className="sm:col-span-3">
          <Field name="currentLocation" label="Current location" defaultValue={truck.currentLocation} readOnly={frozen} />
          <p className="mt-1 text-xs text-slate-400">Last updated: {formatDateTime(truck.locationUpdatedAt)}</p>
        </div>
        {!frozen && (
          <div className="sm:col-span-3">
            <button type="submit" className="btn-primary" disabled={pending}>
              {pending ? "Saving…" : "Save changes"}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}

function Field({
  name,
  label,
  type = "text",
  defaultValue,
  readOnly = false,
}: {
  name: string;
  label: string;
  type?: string;
  defaultValue?: string | number | null;
  readOnly?: boolean;
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
        readOnly={readOnly}
      />
    </div>
  );
}
