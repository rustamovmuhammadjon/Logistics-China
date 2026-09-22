import { displayName, type GpsNumberEntryDto } from "@logistics/shared";

// Read-only for the tracking company — GPS numbers are set by the operator
// themselves (from their own order view); this just surfaces what each of
// the company's operators has already set, across whatever orders that
// specific operator can currently see.
export function GpsNumbersList({ entries }: { entries: GpsNumberEntryDto[] }) {
  return (
    <div className="card space-y-3">
      <h2 className="text-lg font-semibold text-slate-900">GPS numbers</h2>
      {entries.length === 0 ? (
        <p className="text-sm text-slate-400">No GPS numbers set yet.</p>
      ) : (
        <ul className="space-y-2">
          {entries.map((entry) => (
            <li
              key={entry.truckId}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-slate-900">
                  GPS: {entry.gpsNumber}
                  {entry.plateNumber ? ` · ${entry.plateNumber}` : ""}
                </span>
                <span className="text-xs text-slate-500">{displayName(entry.operator)}</span>
              </div>
              <p className="text-xs text-slate-400">
                {entry.groupOrderName} / {entry.subOrderName || "Sub-order"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
