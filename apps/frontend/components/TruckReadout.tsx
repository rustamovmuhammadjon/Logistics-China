import {
  currentTruckOf,
  formatDate,
  hasTransferredOut,
  isCurrentTruck,
  truckRoleLabel,
  type CargoTransferDto,
  type TruckDto,
} from "@logistics/shared";
import { LocationBadge } from "@/components/LocationBadge";

export function TruckReadout({
  truck,
  index,
  total,
}: {
  truck: TruckDto;
  index?: number;
  total?: number;
}) {
  const role = truckRoleLabel(truck);
  const assignment = truck.assignments?.[0];
  const transferred = hasTransferredOut(truck);
  const outgoing = truck.transfersFrom ?? [];
  const incoming = truck.transfersTo ?? [];

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium text-slate-900">
            {typeof index === "number" ? `Truck ${index + 1}` : "Truck"}
            {total && total > 1 ? ` of ${total}` : ""}
            {": "}
            {truck.plateNumber || "No plate"}
            {truck.trailerPlateNumber ? ` / ${truck.trailerPlateNumber}` : ""}
          </p>
          <p className="text-xs text-slate-400">
            {truck.driverName ? `${truck.driverName} · ` : ""}
            {truck.driverPhone || "No driver phone"}
          </p>
        </div>
        <span
          className={
            role === "Cancelled" ? "badge-red" : role === "Transferred" ? "badge-slate" : "badge-green"
          }
        >
          {role}
        </span>
      </div>
      <dl className="grid grid-cols-2 gap-1.5 text-xs sm:grid-cols-4">
        <Fact label="Truck plate" value={truck.plateNumber} />
        {truck.gpsNumber !== undefined && <Fact label="GPS number" value={truck.gpsNumber} />}
        <Fact label="Trailer plate" value={truck.trailerPlateNumber} />
        <Fact label="Country" value={truck.country} />
        <Fact label="Driver name" value={truck.driverName} />
        <Fact label="Driver phone" value={truck.driverPhone} />
        <Fact label="Gross weight (tons)" value={formatNum(truck.cargoWeight)} />
      </dl>

      <LocationBadge
        statusText={truck.currentLocation}
        updatedAt={truck.locationUpdatedAt ?? assignment?.lastPingAt}
        lat={truck.lastLat ?? assignment?.lastLat}
        lng={truck.lastLng ?? assignment?.lastLng}
      />

      {incoming.map((transfer) => (
        <p key={transfer.id} className="text-xs text-slate-500">
          Received from {transfer.fromPlate || transfer.fromTruck?.plateNumber || "previous truck"}
          {transfer.transferDate ? ` on ${formatDate(transfer.transferDate)}` : ""}.
        </p>
      ))}
      {outgoing.map((transfer) => (
        <p key={transfer.id} className="text-xs text-slate-500">
          Transferred to {transfer.toPlate || transfer.toTruck?.plateNumber || "next truck"}
          {transfer.transferDate ? ` on ${formatDate(transfer.transferDate)}` : ""}.
          {transferred ? " Read-only." : ""}
        </p>
      ))}
    </div>
  );
}

/** A one-line summary for a truck that's no longer current (transferred or
 * cancelled) — full detail isn't needed for history, only for the truck
 * actually in play, so a sub-order with several transfers doesn't turn into
 * a wall of repeated fact grids. */
export function TruckHistoryRow({ truck, index }: { truck: TruckDto; index?: number }) {
  const role = truckRoleLabel(truck);
  const nextTransfer = (truck.transfersFrom ?? [])[0];

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-lg bg-slate-50 px-3 py-1.5 text-xs">
      <span className="truncate text-slate-600">
        {typeof index === "number" ? `#${index + 1} · ` : ""}
        <span className="font-medium text-slate-800">{truck.plateNumber || "No plate"}</span>
        {truck.trailerPlateNumber ? ` / ${truck.trailerPlateNumber}` : ""}
        {truck.gpsNumber ? ` · GPS ${truck.gpsNumber}` : ""}
        {nextTransfer ? ` → ${nextTransfer.toPlate || nextTransfer.toTruck?.plateNumber || "next truck"}` : ""}
      </span>
      <span className={role === "Cancelled" ? "badge-red" : "badge-slate"}>{role}</span>
    </div>
  );
}

export function TruckSequence({ trucks }: { trucks: TruckDto[] }) {
  if (trucks.length === 0) {
    return <p className="text-sm text-slate-400">No trucks yet.</p>;
  }
  return (
    <div className="space-y-2">
      {trucks.map((truck, index) =>
        isCurrentTruck(truck) ? (
          <div key={truck.id} className="rounded-xl border border-slate-200 p-3">
            <TruckReadout truck={truck} index={index} total={trucks.length} />
          </div>
        ) : (
          <TruckHistoryRow key={truck.id} truck={truck} index={index} />
        )
      )}
    </div>
  );
}

export function SubOrderLocation({ trucks }: { trucks: TruckDto[] }) {
  const current = currentTruckOf(trucks);
  if (!current) return null;
  const assignment = current.assignments?.[0];
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Current location</p>
      <LocationBadge
        statusText={current.currentLocation}
        updatedAt={current.locationUpdatedAt ?? assignment?.lastPingAt}
        lat={current.lastLat ?? assignment?.lastLat}
        lng={current.lastLng ?? assignment?.lastLng}
      />
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="text-slate-700">{value || "—"}</dd>
    </div>
  );
}

function formatNum(value: number | null | undefined) {
  return value == null ? null : String(value);
}

export function transferHistory(trucks: TruckDto[]): CargoTransferDto[] {
  return trucks.flatMap((truck) => truck.transfersFrom ?? []);
}
