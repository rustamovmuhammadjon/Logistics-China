import { MapPin } from "lucide-react";
import { formatDateTime, freshnessBadgeClass, locationFreshness } from "@logistics/shared";

export function LocationBadge({
  statusText,
  updatedAt,
}: {
  statusText: string | null | undefined;
  updatedAt: string | Date | null | undefined;
}) {
  if (!statusText) return null;
  const freshness = locationFreshness(updatedAt);

  return (
    <p className="mt-2 flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
      <span className="inline-flex items-center gap-1.5">
        <MapPin className="h-3.5 w-3.5 text-brand-600" />
        {statusText}
      </span>
      <span className={freshnessBadgeClass(freshness)}>updated {formatDateTime(updatedAt)}</span>
    </p>
  );
}
