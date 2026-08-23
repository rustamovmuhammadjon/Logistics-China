"use client";

import { useState } from "react";
import { formatDate, type CargoTransferDto, type TruckDto } from "@logistics/shared";
import { formToJson } from "@/lib/api";
import { useApiSubmit } from "@/lib/hooks";
import { ConfirmButton } from "@/components/ConfirmButton";

export function CargoTransferForm({
  apiBase,
  trucks,
  transfers,
  canDelete = false,
}: {
  apiBase: string;
  trucks: TruckDto[];
  transfers: CargoTransferDto[];
  canDelete?: boolean;
}) {
  const { submit, pending, error } = useApiSubmit();
  const [keepTrailer, setKeepTrailer] = useState(false);

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">Cargo transfer</h3>
        <p className="mt-1 text-xs text-slate-400">
          Move cargo to a new truck. Keep the same trailer (only the tractor changes) or enter a new trailer plate.
        </p>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {trucks.length === 0 ? (
        <p className="text-sm text-slate-400">Add the current truck first, then record a transfer.</p>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const body = formToJson(e.currentTarget) as Record<string, unknown>;
            body.keepTrailer = keepTrailer;
            submit(`${apiBase}/transfers`, { body });
            e.currentTarget.reset();
            setKeepTrailer(false);
          }}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        >
          <div>
            <label className="field-label">From truck</label>
            <select className="field-input" name="fromTruckId" required>
              {trucks.map((truck) => (
                <option key={truck.id} value={truck.id}>
                  {truck.plateNumber || truck.id.slice(0, 6)}
                  {truck.trailerPlateNumber ? ` / ${truck.trailerPlateNumber}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">To truck plate</label>
            <input className="field-input" name="toPlateNumber" placeholder="85Y294PA" required />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
            <input
              type="checkbox"
              checked={keepTrailer}
              onChange={(e) => setKeepTrailer(e.target.checked)}
            />
            Trailer stays the same (only the truck changes)
          </label>
          {!keepTrailer && (
            <div className="sm:col-span-2">
              <label className="field-label">To trailer plate</label>
              <input className="field-input" name="toTrailerPlateNumber" placeholder="LB7178TR" />
            </div>
          )}
          <div>
            <label className="field-label">New driver phone</label>
            <input className="field-input" name="driverPhone" placeholder="optional" />
          </div>
          <div>
            <label className="field-label">New driver name</label>
            <input className="field-input" name="driverName" placeholder="optional" />
          </div>
          <div>
            <label className="field-label">Transfer date</label>
            <input className="field-input" type="date" name="transferDate" />
          </div>
          <div>
            <label className="field-label">Comment</label>
            <input className="field-input" name="comment" placeholder="Uzbekistan border" />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" className="btn-primary" disabled={pending}>
              Record transfer
            </button>
          </div>
        </form>
      )}
      {transfers.length > 0 && (
        <ul className="space-y-2">
          {transfers.map((transfer) => (
            <li
              key={transfer.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
            >
              <span>
                {transfer.fromPlate || transfer.fromTruck?.plateNumber || "?"}
                {transfer.fromTrailer || transfer.fromTruck?.trailerPlateNumber
                  ? ` / ${transfer.fromTrailer || transfer.fromTruck?.trailerPlateNumber}`
                  : ""}{" "}
                → <strong>{transfer.toPlate || transfer.toTruck?.plateNumber || "?"}</strong>
                {transfer.toTrailer || transfer.toTruck?.trailerPlateNumber
                  ? ` / ${transfer.toTrailer || transfer.toTruck?.trailerPlateNumber}`
                  : ""}{" "}
                on {formatDate(transfer.transferDate)}
                {transfer.keepTrailer ? " · trailer kept" : ""}
                {transfer.comment ? ` — ${transfer.comment}` : ""}
              </span>
              {canDelete && (
                <ConfirmButton
                  confirmText="Delete this transfer record?"
                  className="text-xs text-red-500 hover:text-red-700"
                  disabled={pending}
                  onConfirm={() => submit(`${apiBase}/transfers/${transfer.id}`, { method: "DELETE" })}
                >
                  Delete
                </ConfirmButton>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
