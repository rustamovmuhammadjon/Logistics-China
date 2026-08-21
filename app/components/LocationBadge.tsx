import { formatDateTime, freshnessBadgeClass, locationFreshness } from "@/lib/stats";

export function LocationBadge({
  statusText,
  updatedAt,
}: {
  statusText: string | null | undefined;
  updatedAt: Date | null | undefined;
}) {
  if (!statusText) return null;

  const freshness = locationFreshness(updatedAt);

  return (
    <p className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 px-3 py-1.5 text-sm text-slate-700">
      <span>📍 {statusText}</span>
      <span className={freshnessBadgeClass(freshness)}>updated {formatDateTime(updatedAt)}</span>
    </p>
  );
}
