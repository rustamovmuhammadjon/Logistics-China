"use client";

import { useMemo, useState } from "react";
import { Info, Pencil, Phone, Plus, Search, Trash2, Truck, UserPlus, UsersRound } from "lucide-react";
import {
  formatDate,
  formatUpdateTime,
  type GuestDriverSuggestionDto,
  type MyDriverDto,
} from "@logistics/shared";
import { formToJson } from "@/lib/api";
import { useApiSubmit } from "@/lib/hooks";
import { Avatar } from "@/components/Avatar";
import { ConfirmButton } from "@/components/ConfirmButton";
import { EmptyState } from "@/components/EmptyState";
import { SlideOver } from "@/components/SlideOver";
import { AppBadge, DriverFormFields, RouteLine, SpecGrid, listingHeadline, vehicleLine, type DriverFormValues } from "../FleetUi";

type Panel = { mode: "create"; values?: DriverFormValues } | { mode: "edit"; driver: MyDriverDto } | null;

function splitName(full: string | null) {
  const [firstName = "", ...rest] = (full ?? "").trim().split(/\s+/);
  return { firstName, lastName: rest.join(" ") };
}

export function MyDrivers({ drivers, suggestions }: { drivers: MyDriverDto[]; suggestions: GuestDriverSuggestionDto[] }) {
  const { submit, pending, error, setError } = useApiSubmit();
  const [panel, setPanel] = useState<Panel>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const stats = useMemo(
    () => ({
      withApp: drivers.filter((d) => d.hasApp).length,
      guests: drivers.filter((d) => !d.hasApp).length,
      onTrip: drivers.filter((d) => d.onTrip).length,
    }),
    [drivers]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return drivers;
    return drivers.filter((d) =>
      [d.firstName, d.lastName, d.phone, d.truckPlate, d.trailerPlate, d.truckModel, d.listing?.bodyType]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [drivers, query]);

  function openCreate(values?: DriverFormValues) {
    setError(null);
    setPanel({ mode: "create", values });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2 text-sm">
          <Stat label="Drivers" value={drivers.length} />
          <Stat label="Use the app" value={stats.withApp} />
          <Stat label="Guests" value={stats.guests} />
          <Stat label="On a trip" value={stats.onTrip} highlight />
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="field-input w-64 pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search drivers"
            />
          </div>
          <button type="button" className="btn-primary" onClick={() => openCreate()}>
            <Plus className="h-4 w-4" />
            Add driver
          </button>
        </div>
      </div>

      {notice && (
        <p className="flex items-start gap-2 rounded-xl border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-700">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          {notice}
        </p>
      )}
      {!panel && error && <p className="text-sm text-red-600">{error}</p>}

      {drivers.length === 0 ? (
        <EmptyState
          icon={<UsersRound className="h-9 w-9" />}
          title="Your roster is empty"
          description="Add drivers from Global drivers, enter one by hand, or pick from the drivers already on your trucks below."
        />
      ) : filtered.length === 0 ? (
        <p className="card text-center text-sm text-slate-500">No driver matches that search.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filtered.map((driver) => (
            <li key={driver.id} className="card flex min-w-0 flex-col gap-4">
              <div className="flex items-start gap-3">
                <Avatar firstName={driver.firstName} lastName={driver.lastName} email={driver.phone} size={44} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-semibold text-slate-900">
                      {driver.firstName} {driver.lastName}
                    </p>
                    <AppBadge hasApp={driver.hasApp} />
                    {driver.onTrip && <span className="badge-green">On a trip</span>}
                  </div>
                  <a href={`tel:${driver.phone}`} className="mt-0.5 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-600">
                    <Phone className="h-3.5 w-3.5" />
                    {driver.phone}
                  </a>
                </div>
              </div>

              <div className="space-y-2">
                <p className="flex items-center gap-2 text-sm text-slate-700">
                  <Truck className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className="truncate">{vehicleLine(driver) ?? "Vehicle not specified"}</span>
                </p>
                {listingHeadline(driver.listing) && (
                  <p className="text-sm font-medium text-slate-900">{listingHeadline(driver.listing)}</p>
                )}
                <RouteLine listing={driver.listing} />
                {driver.listing && <SpecGrid listing={driver.listing} />}
              </div>

              <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                <p className="mr-auto text-xs text-slate-400">
                  Added {formatDate(driver.addedAt)}
                  {driver.addedByLabel ? ` by ${driver.addedByLabel}` : ""}
                </p>
                {driver.hasApp ? (
                  <span className="text-xs text-slate-400" title="Drivers who use the app keep their own profile and ad">
                    Managed by the driver
                  </span>
                ) : (
                  <button
                    type="button"
                    className="btn-secondary px-3 py-1.5"
                    onClick={() => {
                      setError(null);
                      setPanel({ mode: "edit", driver });
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </button>
                )}
                <ConfirmButton
                  confirmText={`Remove ${driver.firstName} ${driver.lastName} from My drivers? Their profile, trips and truck details stay — only the link to your company is removed.`}
                  className="btn-danger px-3 py-1.5"
                  disabled={pending}
                  onConfirm={() => submit(`/api/fleet/my/${driver.id}`, { method: "DELETE" })}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </ConfirmButton>
              </div>
            </li>
          ))}
        </ul>
      )}

      {suggestions.length > 0 && (
        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Drivers on your trucks</h2>
            <p className="text-sm text-slate-500">
              Typed onto trucks in your sub-orders but not in your roster yet. They stay guests until they install the app —
              nothing on the trucks is changed.
            </p>
          </div>
          <div className="card overflow-x-auto p-0">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Driver</th>
                  <th className="px-4 py-3 font-semibold">Truck</th>
                  <th className="px-4 py-3 font-semibold">Last order</th>
                  <th className="px-4 py-3 font-semibold">Seen</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {suggestions.map((s) => (
                  <tr key={s.phone}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900">{s.name || "Unnamed"}</span>
                        <AppBadge hasApp={s.hasApp} />
                      </div>
                      <span className="text-xs text-slate-500">{s.phone}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {s.plateNumber || "—"}
                      {s.trailerPlateNumber ? ` / ${s.trailerPlateNumber}` : ""}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{s.lastOrder}</td>
                    <td className="px-4 py-3 text-slate-500">{formatUpdateTime(s.lastSeenAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        className="btn-secondary px-3 py-1.5"
                        onClick={() =>
                          openCreate({
                            ...splitName(s.name),
                            phone: s.phone,
                            truckPlate: s.plateNumber,
                            trailerPlate: s.trailerPlateNumber,
                          })
                        }
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        Add to My drivers
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <SlideOver
        open={panel !== null}
        title={panel?.mode === "edit" ? `Edit ${panel.driver.firstName} ${panel.driver.lastName}` : "Add a driver"}
        description={
          panel?.mode === "edit"
            ? "A guest driver's details are kept by your company until they start using the app."
            : "For a driver without the app. If they already have a profile under this phone number, that profile is added instead."
        }
        onClose={() => setPanel(null)}
      >
        {panel && (
          <form
            key={panel.mode === "edit" ? panel.driver.id : "create"}
            className="space-y-6"
            onSubmit={async (e) => {
              e.preventDefault();
              const body = formToJson(e.currentTarget);
              if (panel.mode === "edit") {
                const ok = await submit(`/api/fleet/my/${panel.driver.id}`, { method: "PATCH", body });
                if (ok) setPanel(null);
                return;
              }
              const result = await submit<{ driverId: string; existed: boolean }>("/api/fleet/my/manual", { body });
              if (result) {
                setPanel(null);
                setNotice(
                  result.existed
                    ? "That phone number already belongs to a driver — their existing profile was added to My drivers as is."
                    : null
                );
              }
            }}
          >
            <DriverFormFields values={panel.mode === "edit" ? panel.driver : panel.values} />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2 border-t border-slate-100 pt-4">
              <button type="submit" className="btn-primary" disabled={pending}>
                {pending ? "Saving…" : panel.mode === "edit" ? "Save changes" : "Add driver"}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setPanel(null)}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </SlideOver>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <span className="inline-flex items-baseline gap-1.5 rounded-xl border border-slate-200/80 bg-white px-3 py-1.5">
      <span className={`font-semibold tabular-nums ${highlight && value > 0 ? "text-emerald-600" : "text-slate-900"}`}>{value}</span>
      <span className="text-slate-500">{label}</span>
    </span>
  );
}
