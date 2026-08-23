"use client";

import { useState } from "react";
import { formatDateTime, type DriverAssignmentDto, type TruckDto } from "@logistics/shared";
import { formToJson } from "@/lib/api";
import { useApiSubmit } from "@/lib/hooks";
import { ConfirmButton } from "@/components/ConfirmButton";

export function DriverAssignPanel({
  apiBase,
  trucks,
}: {
  apiBase: string;
  trucks: TruckDto[];
}) {
  const { submit, pending, error } = useApiSubmit();
  const [issued, setIssued] = useState<{ code: string; phone: string; plate: string } | null>(null);
  const assignments = trucks.flatMap((truck) =>
    (truck.assignments ?? []).map((assignment) => ({ ...assignment, plateNumber: truck.plateNumber }))
  );

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 p-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">Pair driver app</h3>
        <p className="mt-1 text-xs text-slate-400">
          Create an assignment with the truck plate and the driver’s phone. A one-time 6-digit code appears once —
          send it by call or Telegram. After the driver enters phone + code in the app, the code dies and a token
          stays on the phone.
        </p>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {issued && (
        <div className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-slate-800">
          <p className="text-xs uppercase tracking-wide text-slate-500">Show this code once</p>
          <p className="mt-1 font-mono text-3xl font-bold tracking-[0.3em] text-brand-800">{issued.code}</p>
          <p className="mt-1 text-xs text-slate-500">
            {issued.plate} · {issued.phone} — valid for 24 hours, until the driver signs in.
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
            setIssued({
              code: result.pairingCode,
              phone: String(body.phone ?? ""),
              plate: String(body.plateNumber ?? ""),
            });
            e.currentTarget.reset();
          }
        }}
        className="grid grid-cols-1 gap-3 sm:grid-cols-3"
      >
        <div>
          <label className="field-label">Truck plate</label>
          <input className="field-input" name="plateNumber" list="driver-assign-plates" placeholder="80Z476PA" required />
          <datalist id="driver-assign-plates">
            {trucks.map((truck) =>
              truck.plateNumber ? (
                <option key={truck.id} value={truck.plateNumber} />
              ) : null
            )}
          </datalist>
        </div>
        <div>
          <label className="field-label">Driver phone</label>
          <input className="field-input" name="phone" placeholder="+99890..." required />
        </div>
        <div className="flex items-end">
          <button type="submit" className="btn-primary w-full" disabled={pending}>
            {pending ? "Creating…" : "Create pairing"}
          </button>
        </div>
      </form>
      {assignments.length > 0 && (
        <ul className="space-y-2">
          {assignments.map((assignment) => (
            <li
              key={assignment.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm"
            >
              <span>
                <span className={assignment.status === "ACTIVE" ? "badge-green" : "badge-amber"}>
                  {assignment.status === "ACTIVE" ? "Paired" : "Waiting"}
                </span>{" "}
                <strong>{assignment.plateNumber || "Truck"}</strong> · {assignment.phoneNormalized}
                {assignment.lastPingAt ? (
                  <span className="text-xs text-slate-400"> · GPS {formatDateTime(assignment.lastPingAt)}</span>
                ) : null}
              </span>
              <span className="flex gap-2">
                <button
                  type="button"
                  className="btn-secondary text-xs"
                  disabled={pending}
                  onClick={async () => {
                    const result = await submit<{ pairingCode: string }>(
                      `${apiBase}/assignments/${assignment.id}/regenerate`,
                      { refresh: false }
                    );
                    if (result?.pairingCode) {
                      setIssued({
                        code: result.pairingCode,
                        phone: assignment.phoneNormalized,
                        plate: assignment.plateNumber || "",
                      });
                    }
                  }}
                >
                  New code
                </button>
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
