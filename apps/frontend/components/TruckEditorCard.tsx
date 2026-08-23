"use client";

import { useState } from "react";
import { Ban, Pencil } from "lucide-react";
import { formatDateTime, type TruckDto } from "@logistics/shared";
import { formToJson } from "@/lib/api";
import { useApiSubmit } from "@/lib/hooks";
import { ConfirmButton } from "@/components/ConfirmButton";
import { TruckFields } from "@/components/TruckFields";
import { LocationBadge } from "@/components/LocationBadge";

export function TruckEditorCard({
  truck,
  patchUrl,
  cancelUrl,
  comments,
}: {
  truck: TruckDto;
  patchUrl: string;
  cancelUrl: string;
  comments?: React.ReactNode;
}) {
  const { submit, pending, error } = useApiSubmit();
  const [editing, setEditing] = useState(false);
  const canceled = Boolean(truck.canceledAt);

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium text-slate-900">
            {truck.plateNumber || "Truck"}
            {truck.trailerPlateNumber ? ` / ${truck.trailerPlateNumber}` : ""}
            {canceled ? <span className="badge-red ml-2">Cancelled</span> : null}
          </p>
          <p className="text-xs text-slate-400">
            {truck.driverName ? `${truck.driverName} · ` : ""}
            {truck.driverPhone || ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!canceled && (
            <button type="button" className="btn-secondary text-xs" onClick={() => setEditing((v) => !v)}>
              <Pencil className="h-3.5 w-3.5" />
              {editing ? "Close" : "Edit"}
            </button>
          )}
          {!canceled && (
            <ConfirmButton
              confirmText="Cancel this truck? It will stay in history. You can add a new truck or record a cargo transfer after that."
              disabled={pending}
              onConfirm={() => submit(cancelUrl, { method: "POST" })}
            >
              <Ban className="h-4 w-4" />
              Cancel
            </ConfirmButton>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {editing && !canceled ? (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const result = await submit(patchUrl, { method: "PATCH", body: formToJson(e.currentTarget) });
            if (result) setEditing(false);
          }}
        >
          <TruckFields truck={truck} />
          <p className="mt-1 text-xs text-slate-400">Last location update: {formatDateTime(truck.locationUpdatedAt)}</p>
          <button type="submit" className="btn-primary mt-3" disabled={pending}>
            Save truck
          </button>
        </form>
      ) : (
        <LocationBadge
          statusText={truck.currentLocation}
          updatedAt={truck.locationUpdatedAt}
          lat={truck.lastLat}
          lng={truck.lastLng}
        />
      )}
      {comments}
    </div>
  );
}
