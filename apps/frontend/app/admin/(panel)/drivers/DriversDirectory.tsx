"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Pencil, Plus, Search, Trash2, UserCheck, UserX, X } from "lucide-react";
import { ageFromDob, formatDate, formatDateTime, type AdminDriverDto } from "@logistics/shared";
import { formToJson } from "@/lib/api";
import { useApiSubmit } from "@/lib/hooks";
import { ConfirmButton } from "@/components/ConfirmButton";
import { PhoneField } from "@/components/PhoneField";
import { PlateNumberField } from "@/components/PlateNumberField";

export function DriversDirectory({ drivers }: { drivers: AdminDriverDto[] }) {
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { submit, pending, error } = useApiSubmit();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return drivers;
    return drivers.filter((driver) =>
      [
        driver.firstName,
        driver.lastName,
        driver.phone,
        driver.licenseNumber,
        driver.truckPlate,
        driver.trailerPlate,
        driver.activeTrip?.plateNumber,
        driver.activeTrip?.reference,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [query, drivers]);

  return (
    <div className="space-y-5">
      {creating ? (
        <form
          className="card space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const ok = await submit("/api/admin/drivers", { body: formToJson(e.currentTarget) });
            if (ok) setCreating(false);
          }}
        >
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Register a driver</h2>
            <button type="button" className="text-slate-400 hover:text-slate-700" onClick={() => setCreating(false)}>
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="text-sm text-slate-500">
            When this driver signs in to the app with an operator&apos;s code and enters this phone number, the trip is
            linked to this profile automatically.
          </p>
          <DriverFields />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" className="btn-primary" disabled={pending}>
            {pending ? "Saving…" : "Register driver"}
          </button>
        </form>
      ) : (
        <button type="button" className="btn-primary" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" />
          Register driver
        </button>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          className="field-input pl-9"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, phone, plate or order"
        />
      </div>

      {!creating && error && <p className="text-sm text-red-600">{error}</p>}

      {filtered.length === 0 ? (
        <p className="text-sm text-slate-500">
          {drivers.length === 0 ? "No drivers yet." : "No drivers match that search."}
        </p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((driver) => {
            const age = ageFromDob(driver.dateOfBirth);
            const editing = editingId === driver.id;
            return (
              <li key={driver.id} className="card">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-slate-900">
                      {driver.firstName} {driver.lastName}
                    </h2>
                    <p className="text-sm text-slate-500">{driver.phone}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {driver.activeTrip ? (
                      <span className="badge-green">
                        On trip · {driver.activeTrip.plateNumber || "Truck"} · {driver.activeTrip.reference}
                      </span>
                    ) : (
                      <span className="badge-slate">No active trip</span>
                    )}
                    {!driver.active && <span className="badge-red">Disabled</span>}
                    <span className="badge-slate">{driver.registeredVia === "ADMIN" ? "Added by admin" : "Self-registered"}</span>
                  </div>
                </div>

                {editing ? (
                  <form
                    className="mt-4 space-y-4"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const ok = await submit(`/api/admin/drivers/${driver.id}`, {
                        method: "PATCH",
                        body: formToJson(e.currentTarget),
                      });
                      if (ok) setEditingId(null);
                    }}
                  >
                    <DriverFields driver={driver} />
                    <div className="flex gap-2">
                      <button type="submit" className="btn-primary" disabled={pending}>
                        {pending ? "Saving…" : "Save"}
                      </button>
                      <button type="button" className="btn-secondary" onClick={() => setEditingId(null)}>
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <dl className="mt-4 grid gap-3 sm:grid-cols-3">
                    <Info label="License" value={driver.licenseNumber || "—"} />
                    <Info
                      label="Date of birth"
                      value={driver.dateOfBirth ? `${formatDate(driver.dateOfBirth)}${age != null ? ` (${age})` : ""}` : "—"}
                    />
                    <Info label="Trips" value={String(driver.tripCount)} />
                    <Info label="Truck" value={[driver.truckPlate, driver.truckModel].filter(Boolean).join(" · ") || "—"} />
                    <Info label="Trailer" value={[driver.trailerPlate, driver.trailerType].filter(Boolean).join(" · ") || "—"} />
                    <Info label="Last GPS" value={driver.lastPingAt ? formatDateTime(driver.lastPingAt) : "—"} />
                  </dl>
                )}

                {!editing && (
                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                    <Link href={`/admin/drivers/${driver.id}`} className="btn-secondary">
                      Trip history
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                    <button type="button" className="btn-secondary" onClick={() => setEditingId(driver.id)}>
                      <Pencil className="h-4 w-4" />
                      Edit
                    </button>
                    {driver.active ? (
                      <ConfirmButton
                        confirmText={`Disable ${driver.firstName} ${driver.lastName}? They are signed out of the app and their GPS stops until you enable them again.`}
                        className="btn-secondary"
                        disabled={pending}
                        onConfirm={() =>
                          submit(`/api/admin/drivers/${driver.id}`, { method: "PATCH", body: { active: false } })
                        }
                      >
                        <UserX className="h-4 w-4" />
                        Disable
                      </ConfirmButton>
                    ) : (
                      <button
                        type="button"
                        className="btn-secondary"
                        disabled={pending}
                        onClick={() => submit(`/api/admin/drivers/${driver.id}`, { method: "PATCH", body: { active: true } })}
                      >
                        <UserCheck className="h-4 w-4" />
                        Enable
                      </button>
                    )}
                    <ConfirmButton
                      confirmText={`Delete ${driver.firstName} ${driver.lastName}? Their trips stay on the orders, but this profile and its history link are removed.`}
                      disabled={pending}
                      onConfirm={() => submit(`/api/admin/drivers/${driver.id}`, { method: "DELETE" })}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </ConfirmButton>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function DriverFields({ driver }: { driver?: AdminDriverDto }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <label className="field-label">First name</label>
        <input className="field-input" name="firstName" defaultValue={driver?.firstName} required />
      </div>
      <div>
        <label className="field-label">Last name</label>
        <input className="field-input" name="lastName" defaultValue={driver?.lastName} required />
      </div>
      <PhoneField name="phone" label="Phone" defaultValue={driver?.phone} required />
      <div>
        <label className="field-label">Date of birth</label>
        <input className="field-input" type="date" name="dateOfBirth" defaultValue={driver?.dateOfBirth ?? ""} />
      </div>
      <div>
        <label className="field-label">License number</label>
        <input className="field-input" name="licenseNumber" defaultValue={driver?.licenseNumber ?? ""} />
      </div>
      <PlateNumberField name="truckPlate" label="Own truck plate" defaultValue={driver?.truckPlate} placeholder="80Z476PA" />
      <div>
        <label className="field-label">Truck model</label>
        <input className="field-input" name="truckModel" defaultValue={driver?.truckModel ?? ""} placeholder="Volvo FH 460" />
      </div>
      <PlateNumberField name="trailerPlate" label="Trailer plate" defaultValue={driver?.trailerPlate} />
      <div>
        <label className="field-label">Trailer type</label>
        <input className="field-input" name="trailerType" defaultValue={driver?.trailerType ?? ""} placeholder="Tent, reefer…" />
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="field-label mb-0">{label}</dt>
      <dd className="mt-1 break-words text-sm text-slate-800">{value}</dd>
    </div>
  );
}
