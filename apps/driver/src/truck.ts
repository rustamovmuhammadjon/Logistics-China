import type { TruckListingDto } from "@logistics/shared";

// Stored in English (what the tracking companies' website shows), offered
// to the driver in Uzbek.
export const BODY_TYPES: { value: string; label: string }[] = [
  { value: "Tent", label: "Tent" },
  { value: "Refrigerated", label: "Refrijerator" },
  { value: "Isothermal", label: "Izoterm" },
  { value: "Flatbed", label: "Bortli" },
  { value: "Container", label: "Konteyner" },
  { value: "Tipper", label: "Samosval" },
  { value: "Car carrier", label: "Avtovoz" },
];

export function bodyTypeLabel(value: string | null | undefined) {
  return BODY_TYPES.find((t) => t.value === value)?.label ?? value ?? null;
}

// The choices of the old separate "Treyler turi" field. A driver who only
// filled that in starts with the matching body type selected.
const TRAILER_TO_BODY: Record<string, string> = {
  tent: "Tent",
  refrijerator: "Refrigerated",
  izoterm: "Isothermal",
  "ochiq platforma": "Flatbed",
  konteyner: "Container",
};

export function bodyTypeFromTrailer(trailerType: string | null | undefined) {
  return TRAILER_TO_BODY[trailerType?.trim().toLowerCase() ?? ""] ?? "";
}

export const MAX_VOLUME = 200;

// Same as cbmOf in @logistics/shared (the app only takes types from there):
// length × width × height in metres → cubic metres, 2 decimals.
export function cbmOf(lengthM: number | null | undefined, widthM: number | null | undefined, heightM: number | null | undefined) {
  if (!lengthM || !widthM || !heightM) return null;
  return Math.round(lengthM * widthM * heightM * 100) / 100;
}

// "Toshkent → Moskva"; a missing end shows as "…".
export function routeText(listing: Pick<TruckListingDto, "routeFrom" | "routeTo"> | null | undefined) {
  if (!listing?.routeFrom && !listing?.routeTo) return null;
  return `${listing.routeFrom || "…"} → ${listing.routeTo || "…"}`;
}

// "Tent · 26 t · 71.88 CBM · 4 o'q"
export function specsText(listing: TruckListingDto | null | undefined) {
  if (!listing) return null;
  return (
    [
      bodyTypeLabel(listing.bodyType),
      listing.capacityTons ? `${listing.capacityTons} t` : null,
      listing.volumeM3 ? `${listing.volumeM3} CBM` : null,
      listing.axles ? `${listing.axles} o'q` : null,
    ]
      .filter(Boolean)
      .join(" · ") || null
  );
}
