"use client";

import { useState } from "react";
import { Ban, Pencil } from "lucide-react";
import { formatDateTime, isCurrentTruck, toDateInputValue, type Track718Status, type TruckDto } from "@logistics/shared";
import { formToJson } from "@/lib/api";
import { useApiSubmit } from "@/lib/hooks";
import { ConfirmButton } from "@/components/ConfirmButton";
import { TruckFields } from "@/components/TruckFields";
import { TruckHistoryRow, TruckReadout } from "@/components/TruckReadout";

export function TruckEditorCard({
  truck,
  patchUrl,
  cancelUrl,
  locked = false,
  index,
  total,
}: {
  truck: TruckDto;
  patchUrl: string;
  cancelUrl: string;
  locked?: boolean;
  index?: number;
  total?: number;
}) {
  const { submit, pending, error } = useApiSubmit();
  const [editing, setEditing] = useState(false);
  const current = isCurrentTruck(truck);
  const canEdit = !locked && current;

  // A truck that's already been transferred or cancelled is history, not
  // something the operator needs to act on — a one-line summary keeps a
  // sub-order with several transfers from turning into a wall of repeated
  // fact grids and edit buttons.
  if (!current) return <TruckHistoryRow truck={truck} index={index} />;

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 p-3">
      {canEdit && (
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className="btn-secondary text-xs" onClick={() => setEditing((v) => !v)}>
            <Pencil className="h-3.5 w-3.5" />
            {editing ? "Close" : "Edit"}
          </button>
          <ConfirmButton
            confirmText="Cancel this truck? It will stay in history. You can add a new truck or record a cargo transfer after that."
            disabled={pending}
            onConfirm={() => submit(cancelUrl, { method: "POST" })}
          >
            <Ban className="h-4 w-4" />
            Cancel
          </ConfirmButton>
        </div>
      )}

      <TruckReadout truck={truck} index={index} total={total} />

      {error && <p className="text-sm text-red-600">{error}</p>}

      {editing && canEdit ? (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const result = await submit(patchUrl, { method: "PATCH", body: formToJson(e.currentTarget) });
            if (result) setEditing(false);
          }}
        >
          <TruckFields truck={truck} showGps />
          <p className="mt-1 text-xs text-slate-400">Last location update: {formatDateTime(truck.locationUpdatedAt)}</p>
          <button type="submit" className="btn-primary mt-3" disabled={pending}>
            Save truck
          </button>
        </form>
      ) : null}

      {canEdit && <Track718Panel truck={truck} baseUrl={`${patchUrl}/track718`} />}
    </div>
  );
}

const TRACK718_BADGE: Record<Track718Status, string> = {
  PENDING: "badge-amber",
  ACTIVE: "badge-green",
  STOPPED: "badge-slate",
  ERROR: "badge-red",
};

// China-leg GPS box (track718 "Starlink Box"). The number itself is entered
// manually here; everything else (status, last known address) fills in once
// webhook pushes start arriving — a later phase, not this form.
function Track718Panel({ truck, baseUrl }: { truck: TruckDto; baseUrl: string }) {
  const { submit, pending, error } = useApiSubmit();
  const track718 = truck.track718;

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <h4 className="text-sm font-semibold text-slate-800">track718 GPS box</h4>
      {track718 ? (
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
          <span className="font-medium text-slate-700">{track718.trackingNumber}</span>
          <span className={TRACK718_BADGE[track718.status]}>{track718.status}</span>
          {track718.error && <span className="text-red-600">{track718.error}</span>}
        </div>
      ) : (
        <p className="mt-1 text-xs text-slate-400">No tracking number set.</p>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(baseUrl, { method: "PATCH", body: formToJson(e.currentTarget) });
        }}
        className="mt-2 flex flex-wrap items-end gap-2"
      >
        <div className="flex-1">
          <label className="field-label">Tracking number</label>
          <input
            className="field-input"
            type="text"
            name="trackingNumber"
            defaultValue={track718?.trackingNumber ?? ""}
            placeholder="track718 GPS number"
            required
          />
        </div>
        <div>
          <label className="field-label">Track from</label>
          <input className="field-input" type="date" name="trackFrom" defaultValue={toDateInputValue(track718?.trackFrom ?? null)} />
        </div>
        <button type="submit" className="btn-secondary shrink-0" disabled={pending}>
          Save
        </button>
      </form>
      {track718 && (
        <ConfirmButton
          className="mt-2 text-xs text-red-500 hover:text-red-700"
          confirmText="Remove this tracking number?"
          disabled={pending}
          onConfirm={() => submit(baseUrl, { method: "DELETE" })}
        >
          Remove
        </ConfirmButton>
      )}
    </div>
  );
}
