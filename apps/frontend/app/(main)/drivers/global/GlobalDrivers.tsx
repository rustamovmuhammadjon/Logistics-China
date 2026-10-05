"use client";

import { useMemo, useState } from "react";
import { Check, Globe, Phone, Plus, Search } from "lucide-react";
import { TRUCK_BODY_TYPES, formatUpdateTime, type GlobalDriverDto } from "@logistics/shared";
import { useApiSubmit } from "@/lib/hooks";
import { Avatar } from "@/components/Avatar";
import { EmptyState } from "@/components/EmptyState";
import { AvailabilityBadge, RouteLine, SpecGrid, listingHeadline, vehicleLine } from "../FleetUi";

function parseMin(value: string) {
  const n = Number(value.replace(",", "."));
  return value.trim() && Number.isFinite(n) ? n : null;
}

export function GlobalDrivers({ drivers }: { drivers: GlobalDriverDto[] }) {
  const { submit, pending, error } = useApiSubmit();
  const [query, setQuery] = useState("");
  const [bodyType, setBodyType] = useState("");
  const [minCapacity, setMinCapacity] = useState("");
  const [minLength, setMinLength] = useState("");
  const [addingId, setAddingId] = useState<string | null>(null);

  const bodyTypes = useMemo(() => {
    const extra = drivers.map((d) => d.listing?.bodyType).filter((t): t is string => !!t);
    return [...new Set([...TRUCK_BODY_TYPES, ...extra])];
  }, [drivers]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const cap = parseMin(minCapacity);
    const len = parseMin(minLength);
    return drivers.filter((driver) => {
      const l = driver.listing;
      if (bodyType && l?.bodyType !== bodyType) return false;
      if (cap != null && (l?.capacityTons ?? 0) < cap) return false;
      if (len != null && (l?.lengthM ?? 0) < len) return false;
      if (!q) return true;
      return [driver.firstName, driver.lastName, driver.phone, driver.truckPlate, driver.truckModel, l?.routeFrom, l?.routeTo, l?.note]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [drivers, query, bodyType, minCapacity, minLength]);

  if (drivers.length === 0) {
    return (
      <EmptyState
        icon={<Globe className="h-9 w-9" />}
        title="No truck ads yet"
        description="When drivers publish their truck in the app — body type, size, capacity — it shows up here for every tracking company."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-end gap-3 p-4">
        <div className="relative min-w-[220px] flex-1">
          <label className="field-label">Search</label>
          <Search className="pointer-events-none absolute bottom-3 left-3 h-4 w-4 text-slate-400" />
          <input
            className="field-input pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name, phone, plate, route"
          />
        </div>
        <div className="w-44">
          <label className="field-label">Body type</label>
          <select className="field-input" value={bodyType} onChange={(e) => setBodyType(e.target.value)}>
            <option value="">Any</option>
            {bodyTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
        <div className="w-32">
          <label className="field-label">Min capacity, t</label>
          <input className="field-input" inputMode="decimal" value={minCapacity} onChange={(e) => setMinCapacity(e.target.value)} />
        </div>
        <div className="w-32">
          <label className="field-label">Min length, m</label>
          <input className="field-input" inputMode="decimal" value={minLength} onChange={(e) => setMinLength(e.target.value)} />
        </div>
        <p className="pb-2.5 text-sm text-slate-500">
          {filtered.length} of {drivers.length}
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {filtered.length === 0 ? (
        <p className="card text-center text-sm text-slate-500">No truck matches these filters.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {filtered.map((driver) => {
            const vehicle = vehicleLine(driver);
            return (
              <li key={driver.id} className="card flex min-w-0 flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <p className="text-lg font-semibold tracking-tight text-slate-900">
                      {listingHeadline(driver.listing) ?? "Truck"}
                    </p>
                    <RouteLine listing={driver.listing} />
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <AvailabilityBadge onTrip={driver.onTrip} />
                    <span className="text-xs text-slate-400">Updated {formatUpdateTime(driver.listing?.updatedAt)}</span>
                  </div>
                </div>

                <SpecGrid listing={driver.listing} />

                {driver.listing?.note && <p className="text-sm leading-relaxed text-slate-600">{driver.listing.note}</p>}

                <div className="mt-auto flex items-center gap-3 border-t border-slate-100 pt-4">
                  <Avatar firstName={driver.firstName} lastName={driver.lastName} email={driver.phone} size={38} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {driver.firstName} {driver.lastName}
                    </p>
                    <p className="truncate text-xs text-slate-500">{vehicle ?? "Vehicle not specified"}</p>
                  </div>
                  <a href={`tel:${driver.phone}`} className="btn-secondary px-3" title={driver.phone}>
                    <Phone className="h-4 w-4" />
                  </a>
                  {driver.inMyDrivers ? (
                    <span className="btn bg-emerald-50 px-3 text-emerald-700">
                      <Check className="h-4 w-4" />
                      In My drivers
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="btn-primary px-3"
                      disabled={pending}
                      onClick={async () => {
                        setAddingId(driver.id);
                        await submit("/api/fleet/my", { body: { driverId: driver.id } });
                        setAddingId(null);
                      }}
                    >
                      <Plus className="h-4 w-4" />
                      {addingId === driver.id ? "Adding…" : "Add"}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
