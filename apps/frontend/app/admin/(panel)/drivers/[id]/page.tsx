import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  driverTripStatusLabel,
  formatDate,
  formatDateTime,
  formatDirection,
  type AdminDriverDto,
  type AdminDriverTripDto,
  type DriverTripStatus,
} from "@logistics/shared";
import { serverApiOrNull } from "@/lib/server-api";

export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<DriverTripStatus, string> = {
  ACTIVE: "badge-green",
  COMPLETED: "badge-slate",
  CANCELED: "badge-red",
  TRANSFERRED: "badge-amber",
  ENDED: "badge-slate",
};

export default async function AdminDriverPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await serverApiOrNull<{ driver: AdminDriverDto; trips: AdminDriverTripDto[] }>(`/api/admin/drivers/${id}`);
  if (!data) notFound();
  const { driver, trips } = data;

  return (
    <div className="space-y-6">
      <Link href="/admin/drivers" className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline">
        <ArrowLeft className="h-4 w-4" />
        All drivers
      </Link>

      <div className="card space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold text-slate-900">
            {driver.firstName} {driver.lastName}
          </h1>
          {!driver.active && <span className="badge-red">Disabled</span>}
        </div>
        <p className="text-sm text-slate-500">
          {driver.phone} · registered {formatDate(driver.createdAt)} ·{" "}
          {driver.registeredVia === "ADMIN" ? "added by admin" : "self-registered in the app"}
        </p>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Trips ({trips.length})</h2>
        {trips.length === 0 ? (
          <p className="card text-center text-slate-400">This driver hasn&apos;t been paired with a truck yet.</p>
        ) : (
          <div className="card overflow-x-auto p-0">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Order</th>
                  <th className="px-4 py-3 font-semibold">Route</th>
                  <th className="px-4 py-3 font-semibold">Truck</th>
                  <th className="px-4 py-3 font-semibold">Paired</th>
                  <th className="px-4 py-3 font-semibold">Last GPS</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {trips.map((trip) => (
                  <tr key={trip.id}>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/orders/${trip.groupOrderId}/suborders/${trip.subOrderId}`}
                        className="font-medium text-brand-600 hover:underline"
                      >
                        {trip.order.reference}
                        {trip.order.subOrderName ? ` · ${trip.order.subOrderName}` : ""}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDirection(trip.order.origin, trip.order.destination) ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {trip.truck.plateNumber || "—"}
                      {trip.truck.trailerPlateNumber ? ` / ${trip.truck.trailerPlateNumber}` : ""}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(trip.pairedAt)}</td>
                    <td className="px-4 py-3 text-slate-600">{trip.lastPingAt ? formatDateTime(trip.lastPingAt) : "—"}</td>
                    <td className="px-4 py-3">
                      <span className={STATUS_BADGE[trip.status]}>{driverTripStatusLabel(trip.status)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
