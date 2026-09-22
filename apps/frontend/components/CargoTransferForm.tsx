"use client";

import { useState } from "react";
import { formatDate, MAX_TRANSFERS_PER_SUB_ORDER, type CargoTransferDto, type TruckDto } from "@logistics/shared";
import { formToJson } from "@/lib/api";
import { useApiSubmit } from "@/lib/hooks";
import { ConfirmButton } from "@/components/ConfirmButton";

export function CargoTransferForm({
  apiBase,
  trucks,
  transfers,
  canDelete = false,
  readOnly = false,
  showGps = false,
}: {
  apiBase: string;
  trucks: TruckDto[];
  transfers: CargoTransferDto[];
  canDelete?: boolean;
  readOnly?: boolean;
  // Operator-only — the new vehicle's GPS number can only ever be set by
  // the operator recording the transfer (see createCargoTransfer).
  showGps?: boolean;
}) {
  const { submit, pending, error } = useApiSubmit();
  const [keepTrailer, setKeepTrailer] = useState(false);
  const limitReached = transfers.length >= MAX_TRANSFERS_PER_SUB_ORDER;

  return (
    <div className="space-y-2">
      {error && !readOnly && <p className="text-sm text-red-600">{error}</p>}
      {readOnly ? null : limitReached ? (
        <p className="text-xs text-amber-600">Maximum of {MAX_TRANSFERS_PER_SUB_ORDER} transfers reached for this sub-order.</p>
      ) : trucks.length === 0 ? (
        <p className="text-xs text-slate-400">Add the current truck first, then record a transfer.</p>
      ) : (
        <details className="group rounded-xl border border-slate-200">
          <summary className="cursor-pointer list-none px-3 py-2 text-sm font-medium text-slate-700 marker:content-none">
            Record cargo transfer <span className="text-xs font-normal text-slate-400">({transfers.length}/{MAX_TRANSFERS_PER_SUB_ORDER} used)</span>
          </summary>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const body = formToJson(e.currentTarget) as Record<string, unknown>;
              body.keepTrailer = keepTrailer;
              submit(`${apiBase}/transfers`, { body });
              e.currentTarget.reset();
              setKeepTrailer(false);
            }}
            className="grid grid-cols-2 gap-2 border-t border-slate-100 p-3 sm:grid-cols-3"
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
            {showGps && (
              <div>
                <label className="field-label">New GPS number</label>
                <input className="field-input" name="gpsNumber" placeholder="GPS tracker ID" />
              </div>
            )}
            <div className="col-span-2 sm:col-span-3">
              <label className="field-label">Current location</label>
              <input className="field-input" name="currentLocation" placeholder="e.g. Tashkent" required />
            </div>
            <label className="col-span-2 flex items-center gap-2 text-xs text-slate-700 sm:col-span-3">
              <input type="checkbox" checked={keepTrailer} onChange={(e) => setKeepTrailer(e.target.checked)} />
              Trailer stays the same (only the truck changes)
            </label>
            {!keepTrailer && (
              <div className="col-span-2 sm:col-span-3">
                <label className="field-label">To trailer plate</label>
                <input className="field-input" name="toTrailerPlateNumber" placeholder="LB7178TR" />
              </div>
            )}
            <div>
              <label className="field-label">New vehicle country</label>
              <input className="field-input" name="country" required />
            </div>
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
            <div className="col-span-2 sm:col-span-2">
              <label className="field-label">Comment</label>
              <input className="field-input" name="comment" placeholder="Uzbekistan border" />
            </div>
            <div className="col-span-2 sm:col-span-3">
              <button type="submit" className="btn-primary" disabled={pending}>
                Record transfer
              </button>
            </div>
          </form>
        </details>
      )}
      {transfers.length > 0 && (
        <ul className="space-y-1.5">
          {transfers.map((transfer) => (
            <li
              key={transfer.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-1.5 text-xs"
            >
              <span className="text-slate-600">
                {transfer.fromPlate || transfer.fromTruck?.plateNumber || "?"}
                {transfer.fromTrailer || transfer.fromTruck?.trailerPlateNumber
                  ? ` / ${transfer.fromTrailer || transfer.fromTruck?.trailerPlateNumber}`
                  : ""}{" "}
                → <strong className="text-slate-800">{transfer.toPlate || transfer.toTruck?.plateNumber || "?"}</strong>
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
