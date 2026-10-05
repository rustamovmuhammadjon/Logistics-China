"use client";

import { useState } from "react";
import { Smartphone, UserRound } from "lucide-react";
import { TRUCK_BODY_TYPES, cbmOf, type FleetDriverDto, type TruckListingDto } from "@logistics/shared";
import { PhoneField } from "@/components/PhoneField";
import { PlateNumberField } from "@/components/PlateNumberField";

const fmt = (n: number | null | undefined) => (n == null ? null : Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0$/, ""));

export function dimensions(listing: TruckListingDto | null) {
  if (!listing) return null;
  const parts = [listing.lengthM, listing.widthM, listing.heightM].map(fmt);
  if (parts.every((p) => p == null)) return null;
  return `${parts.map((p) => p ?? "–").join(" × ")} m`;
}

export function listingHeadline(listing: TruckListingDto | null) {
  if (!listing) return null;
  return [listing.bodyType, listing.capacityTons != null ? `${fmt(listing.capacityTons)} t` : null].filter(Boolean).join(" · ") || null;
}

export function AppBadge({ hasApp }: { hasApp: boolean }) {
  return hasApp ? (
    <span className="badge-green" title="Signed in to the driver app">
      <Smartphone className="h-3 w-3" />
      App
    </span>
  ) : (
    <span className="badge-slate" title="Hasn't installed the driver app yet">
      <UserRound className="h-3 w-3" />
      Guest
    </span>
  );
}

// Length / width / height / volume / axles as a small labelled grid — the
// numbers a dispatcher scans when matching a load to a truck.
export function SpecGrid({ listing }: { listing: TruckListingDto | null }) {
  const items: [string, string | null][] = [
    ["Length", listing?.lengthM != null ? `${fmt(listing.lengthM)} m` : null],
    ["Width", listing?.widthM != null ? `${fmt(listing.widthM)} m` : null],
    ["Height", listing?.heightM != null ? `${fmt(listing.heightM)} m` : null],
    ["CBM", listing?.volumeM3 != null ? fmt(listing.volumeM3) : null],
    ["Axles", listing?.axles != null ? String(listing.axles) : null],
  ];
  return (
    <dl className="grid grid-cols-5 divide-x divide-slate-100 rounded-xl border border-slate-100 bg-slate-50/70">
      {items.map(([label, value]) => (
        <div key={label} className="min-w-0 px-2 py-2 text-center">
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
          <dd className={`mt-0.5 truncate text-sm font-semibold tabular-nums ${value ? "text-slate-900" : "text-slate-300"}`}>
            {value ?? "—"}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function vehicleLine(driver: Pick<FleetDriverDto, "truckPlate" | "truckModel" | "trailerPlate" | "trailerType">) {
  const truck = [driver.truckPlate, driver.truckModel].filter(Boolean).join(" · ");
  const trailer = [driver.trailerPlate, driver.trailerType].filter(Boolean).join(" · ");
  return [truck, trailer ? `trailer ${trailer}` : null].filter(Boolean).join("  /  ") || null;
}

export type DriverFormValues = Partial<{
  firstName: string;
  lastName: string;
  phone: string;
  truckPlate: string | null;
  truckModel: string | null;
  trailerPlate: string | null;
  trailerType: string | null;
  listing: TruckListingDto | null;
}>;

// Shared by "Add driver" and "Edit" — field names match what the backend reads.
export function DriverFormFields({ values }: { values?: DriverFormValues }) {
  const listing = values?.listing ?? null;
  return (
    <div className="space-y-6">
      <fieldset className="space-y-3">
        <legend className="mb-1 text-sm font-semibold text-slate-900">Driver</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="field-label">First name</label>
            <input className="field-input" name="firstName" defaultValue={values?.firstName} required />
          </div>
          <div>
            <label className="field-label">Last name</label>
            <input className="field-input" name="lastName" defaultValue={values?.lastName} required />
          </div>
        </div>
        <PhoneField name="phone" label="Phone" defaultValue={values?.phone} required />
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="mb-1 text-sm font-semibold text-slate-900">Truck & trailer</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <PlateNumberField name="truckPlate" label="Truck plate" defaultValue={values?.truckPlate} placeholder="80Z476PA" />
          <div>
            <label className="field-label">Truck model</label>
            <input className="field-input" name="truckModel" defaultValue={values?.truckModel ?? ""} placeholder="Volvo FH 460" />
          </div>
          <PlateNumberField name="trailerPlate" label="Trailer plate" defaultValue={values?.trailerPlate} />
          <div>
            <label className="field-label">Trailer type</label>
            <input className="field-input" name="trailerType" defaultValue={values?.trailerType ?? ""} placeholder="Tent, reefer…" />
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="mb-1 text-sm font-semibold text-slate-900">Specifications</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="field-label">Body type</label>
            <select className="field-input" name="bodyType" defaultValue={listing?.bodyType ?? ""}>
              <option value="">Not set</option>
              {TRUCK_BODY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
              {listing?.bodyType && !(TRUCK_BODY_TYPES as readonly string[]).includes(listing.bodyType) && (
                <option value={listing.bodyType}>{listing.bodyType}</option>
              )}
            </select>
          </div>
          <div>
            <label className="field-label">Axles</label>
            <select className="field-input" name="axles" defaultValue={listing?.axles ? String(listing.axles) : ""}>
              <option value="">Not set</option>
              {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>
        <MeasureFields listing={listing} />
        <div>
          <label className="field-label">Base city</label>
          <input className="field-input" name="baseCity" defaultValue={listing?.baseCity ?? ""} placeholder="Tashkent" />
        </div>
        <div>
          <label className="field-label">Note</label>
          <textarea className="field-input min-h-[72px]" name="note" defaultValue={listing?.note ?? ""} />
        </div>
      </fieldset>
    </div>
  );
}

type Measures = Record<"lengthM" | "widthM" | "heightM" | "volumeM3" | "capacityTons", string>;

const measureText = (n: number | null | undefined) => (n == null ? "" : String(n));

function measureValue(text: string) {
  const n = Number(text.trim().replace(",", "."));
  return text.trim() && Number.isFinite(n) && n > 0 ? n : null;
}

// Once length, width and height are all in, the volume (CBM) fills itself in
// — the backend stores the same product, so the two always agree.
function MeasureFields({ listing }: { listing: TruckListingDto | null }) {
  const [values, setValues] = useState<Measures>({
    lengthM: measureText(listing?.lengthM),
    widthM: measureText(listing?.widthM),
    heightM: measureText(listing?.heightM),
    volumeM3: measureText(listing?.volumeM3),
    capacityTons: measureText(listing?.capacityTons),
  });
  const autoVolume = cbmOf(measureValue(values.lengthM), measureValue(values.widthM), measureValue(values.heightM));
  const field = (name: keyof Measures, label: string) => (
    <NumberField name={name} label={label} value={values[name]} onValue={(value) => setValues((v) => ({ ...v, [name]: value }))} />
  );

  return (
    <div className="grid grid-cols-3 gap-3">
      {field("lengthM", "Length, m")}
      {field("widthM", "Width, m")}
      {field("heightM", "Height, m")}
      {autoVolume != null ? (
        <NumberField name="volumeM3" label="Volume, CBM" value={String(autoVolume)} hint="L × W × H" readOnly />
      ) : (
        field("volumeM3", "Volume, CBM")
      )}
      {field("capacityTons", "Capacity, t")}
    </div>
  );
}

function NumberField({
  name,
  label,
  value,
  onValue,
  hint,
  readOnly,
}: {
  name: string;
  label: string;
  value: string;
  onValue?: (value: string) => void;
  hint?: string;
  readOnly?: boolean;
}) {
  return (
    <div>
      <label className="field-label">{label}</label>
      <input
        className={`field-input tabular-nums ${readOnly ? "bg-slate-50 font-semibold text-brand-700" : ""}`}
        name={name}
        inputMode="decimal"
        value={value}
        readOnly={readOnly}
        onChange={(e) => onValue?.(e.currentTarget.value.replace(/[^0-9.,]/g, ""))}
      />
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
