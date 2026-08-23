import { MapPin } from "lucide-react";
import { formatDateTime, freshnessBadgeClass, gpsFreshness, locationFreshness } from "@logistics/shared";

export function LocationBadge({
  statusText,
  updatedAt,
  lat,
  lng,
}: {
  statusText: string | null | undefined;
  updatedAt: string | Date | null | undefined;
  lat?: number | null;
  lng?: number | null;
}) {
  if (!statusText && (lat == null || lng == null)) return null;
  const hasGps = lat != null && lng != null;
  const freshness = hasGps ? gpsFreshness(updatedAt) : locationFreshness(updatedAt);
  const mapsHref = hasGps ? `https://maps.google.com/?q=${lat},${lng}` : null;

  return (
    <p className="mt-2 flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
      <span className="inline-flex items-center gap-1.5">
        <MapPin className="h-3.5 w-3.5 text-brand-600" />
        {mapsHref ? (
          <a href={mapsHref} target="_blank" rel="noreferrer" className="font-medium text-brand-700 hover:underline">
            {statusText || `${lat!.toFixed(5)}, ${lng!.toFixed(5)}`}
          </a>
        ) : (
          statusText
        )}
      </span>
      <span className={freshnessBadgeClass(freshness)}>updated {formatDateTime(updatedAt)}</span>
    </p>
  );
}
