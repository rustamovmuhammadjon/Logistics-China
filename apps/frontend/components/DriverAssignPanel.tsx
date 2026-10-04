"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { formatDateTime, type TruckDto } from "@logistics/shared";
import { formToJson } from "@/lib/api";
import { useApiSubmit } from "@/lib/hooks";
import { ConfirmButton } from "@/components/ConfirmButton";
import { PlateNumberField } from "@/components/PlateNumberField";

const DURATION_OPTIONS = [
  { minutes: 15, label: "15 minutes" },
  { minutes: 30, label: "30 minutes" },
  { minutes: 60, label: "1 hour" },
  { minutes: 180, label: "3 hours" },
];

function describeMinutes(minutes: number) {
  return minutes >= 60 ? `${minutes / 60}h` : `${minutes}m`;
}

export function DriverAssignPanel({
  apiBase,
  trucks,
}: {
  apiBase: string;
  trucks: TruckDto[];
}) {
  const { submit, pending, error } = useApiSubmit();
  const [issued, setIssued] = useState<{ code: string; plate: string; minutes: number } | null>(null);
  const [display, setDisplay] = useState<"code" | "qr">("code");
  const assignments = trucks.flatMap((truck) =>
    (truck.assignments ?? []).map((assignment) => ({ ...assignment, plateNumber: truck.plateNumber }))
  );

  function showIssued(code: string, plate: string, minutes: number) {
    setIssued({ code, plate, minutes });
    setDisplay("code");
  }

  return (
    <div className="space-y-2 rounded-xl border border-slate-200 p-3">
      <h3 className="text-sm font-semibold text-slate-900">Pair driver app</h3>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {issued && (
        <div className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-slate-800">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wide text-slate-500">Show this once</p>
            <div className="flex gap-2 text-xs">
              <button
                type="button"
                onClick={() => setDisplay("code")}
                className={display === "code" ? "font-semibold text-brand-800" : "text-slate-500"}
              >
                Code
              </button>
              <button
                type="button"
                onClick={() => setDisplay("qr")}
                className={display === "qr" ? "font-semibold text-brand-800" : "text-slate-500"}
              >
                QR
              </button>
            </div>
          </div>
          {display === "code" ? (
            <p className="mt-1 font-mono text-3xl font-bold tracking-[0.2em] text-brand-800">{issued.code}</p>
          ) : (
            <div className="mt-2 inline-block rounded-lg bg-white p-3">
              <QRCodeSVG value={issued.code} size={160} />
            </div>
          )}
          <p className="mt-1 text-xs text-slate-500">
            {issued.plate} — valid {describeMinutes(issued.minutes)}, until the driver signs in.
          </p>
        </div>
      )}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const body = formToJson(e.currentTarget);
          const result = await submit<{ pairingCode: string }>(`${apiBase}/assignments`, {
            body,
            refresh: false,
          });
          if (result?.pairingCode) {
            showIssued(result.pairingCode, String(body.plateNumber ?? ""), Number(body.expiresInMinutes));
            e.currentTarget.reset();
          }
        }}
        className="grid grid-cols-2 gap-2 sm:grid-cols-4"
      >
        <PlateNumberField name="plateNumber" label="Truck plate" list="driver-assign-plates" placeholder="80Z476PA" required>
          <datalist id="driver-assign-plates">
            {trucks.map((truck) =>
              truck.plateNumber ? (
                <option key={truck.id} value={truck.plateNumber} />
              ) : null
            )}
          </datalist>
        </PlateNumberField>
        <div>
          <label className="field-label">Valid for</label>
          <select name="expiresInMinutes" className="field-input" defaultValue="30">
            {DURATION_OPTIONS.map((opt) => (
              <option key={opt.minutes} value={opt.minutes}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-2 flex items-end">
          <button type="submit" className="btn-primary w-full" disabled={pending}>
            {pending ? "Creating…" : "Create pairing"}
          </button>
        </div>
      </form>
      {assignments.length > 0 && (
        <ul className="space-y-1.5">
          {assignments.map((assignment) => (
            <li
              key={assignment.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-1.5 text-xs"
            >
              <span>
                <span className={assignment.status === "ACTIVE" ? "badge-green" : "badge-amber"}>
                  {assignment.status === "ACTIVE" ? "Paired" : "Waiting"}
                </span>{" "}
                <strong>{assignment.plateNumber || "Truck"}</strong>
                {assignment.lastPingAt ? (
                  <span className="text-slate-400"> · GPS {formatDateTime(assignment.lastPingAt)}</span>
                ) : null}
              </span>
              <span className="flex items-center gap-2">
                <form
                  className="flex items-center gap-1"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const body = formToJson(e.currentTarget);
                    const result = await submit<{ pairingCode: string }>(
                      `${apiBase}/assignments/${assignment.id}/regenerate`,
                      { body, refresh: false }
                    );
                    if (result?.pairingCode) {
                      showIssued(result.pairingCode, assignment.plateNumber || "", Number(body.expiresInMinutes));
                    }
                  }}
                >
                  <select name="expiresInMinutes" defaultValue="30" className="rounded border border-slate-200 px-1 py-0.5 text-xs">
                    {DURATION_OPTIONS.map((opt) => (
                      <option key={opt.minutes} value={opt.minutes}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <button type="submit" className="btn-secondary text-xs" disabled={pending}>
                    New code
                  </button>
                </form>
                <ConfirmButton
                  confirmText="Revoke this pairing? The driver app will stop sending location."
                  className="text-xs text-red-500 hover:text-red-700"
                  disabled={pending}
                  onConfirm={() => submit(`${apiBase}/assignments/${assignment.id}`, { method: "DELETE" })}
                >
                  Revoke
                </ConfirmButton>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
