"use client";

import { useState } from "react";
import { Ban, Pencil } from "lucide-react";
import { formatDateTime, isCurrentTruck, type TruckDto } from "@logistics/shared";
import { formToJson } from "@/lib/api";
import { useApiSubmit } from "@/lib/hooks";
import { ConfirmButton } from "@/components/ConfirmButton";
import { TruckFields } from "@/components/TruckFields";
import { TruckReadout } from "@/components/TruckReadout";

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
  const canEdit = !locked && isCurrentTruck(truck);

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 p-4">
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
    </div>
  );
}
