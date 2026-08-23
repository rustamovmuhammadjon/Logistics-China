import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { formatDate, formatDateTime, formatDirection, truckStats, type GroupOrderDto } from "@logistics/shared";
import { serverApiOrNull } from "@/lib/server-api";
import { LocationBadge } from "@/components/LocationBadge";
import { PaymentBadge } from "@/components/PaymentBadge";

export const dynamic = "force-dynamic";

export default async function TrackOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await serverApiOrNull<{ order: GroupOrderDto }>(`/api/monitoring/orders/${id}`);
  if (!data) notFound();
  const order = data.order;
  const stats = truckStats(order.subOrders.flatMap((s) => s.trucks));

  return (
    <>
    <Link href="/" className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline">
        <ArrowLeft className="h-4 w-4" />
        All orders
      </Link>

      <header className="card mb-6 mt-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{order.name}</h1>
            {formatDirection(order.origin, order.destination) && (
              <p className="text-sm text-slate-600">{formatDirection(order.origin, order.destination)}</p>
            )}
            <p className="text-xs text-slate-400">
              Opened {formatDate(order.openedAt)}
              {order.arrivedAt ? ` · Arrived ${formatDate(order.arrivedAt)}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="badge-slate">{stats.total} trucks</span>
            <span className={stats.driverPaid === stats.total && stats.total > 0 ? "badge-green" : "badge-amber"}>
              Driver paid {stats.driverPaid}/{stats.total}
            </span>
            <span className={stats.customerPaid === stats.total && stats.total > 0 ? "badge-green" : "badge-amber"}>
              Customer paid {stats.customerPaid}/{stats.total}
            </span>
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Field label="POL" value={order.pol} />
          <Field label="Commodity" value={order.commodity} />
          <Field label="Volume" value={order.volumeInfo} />
          <Field label="Factory load" value={formatDate(order.factoryLoadDate)} />
        </dl>

        <LocationBadge statusText={order.statusText} updatedAt={order.statusUpdatedAt} />

        {order.comments && order.comments.length > 0 && (
          <div className="mt-4">
            <h3 className="mb-2 text-sm font-semibold text-slate-700">Comments</h3>
            <ul className="space-y-2">
              {order.comments.map((c) => (
                <li key={c.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                  <p className="whitespace-pre-wrap text-slate-800">{c.text}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {c.author ? `${c.author} · ` : ""}
                    {formatDateTime(c.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </header>

      <h2 className="mb-3 text-lg font-semibold text-slate-900">Sub-orders</h2>
      <div className="space-y-4">
        {order.subOrders.length === 0 && <p className="card text-center text-slate-400">No sub-orders yet.</p>}
        {order.subOrders.map((sub) => {
          const subStats = truckStats(sub.trucks);
          return (
            <details key={sub.id} className="card" open>
              <summary className="cursor-pointer list-none">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-semibold text-slate-900">{sub.name || "Sub-order"}</span>
                    <span className="ml-2 text-xs text-slate-400">
                      Opened {formatDate(sub.openedAt)}
                      {sub.arrivedAt ? ` · Arrived ${formatDate(sub.arrivedAt)}` : ""}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <span className={sub.status === "CLOSED" ? "badge-slate" : "badge-green"}>
                      {sub.status === "CLOSED" ? "Closed" : "Open"}
                    </span>
                    <span className="badge-slate">{subStats.total} trucks</span>
                  </div>
                </div>
              </summary>

              <LocationBadge statusText={sub.statusText} updatedAt={sub.statusUpdatedAt} />

              <div className="mt-4 space-y-3">
                {sub.trucks.map((truck) => (
                  <div key={truck.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-slate-900">
                          {truck.plateNumber || "Truck"}
                          {truck.trailerPlateNumber ? ` / ${truck.trailerPlateNumber}` : ""}
                        </p>
                        <p className="text-xs text-slate-400">
                          {truck.driverName ? `${truck.driverName} · ` : ""}
                          {truck.driverPhone || ""}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <PaymentBadge status={truck.driverPaymentStatus} label="Driver" />
                        <PaymentBadge status={truck.customerPaymentStatus} label="Customer" />
                      </div>
                    </div>
                    <LocationBadge
                      statusText={truck.currentLocation}
                      updatedAt={truck.locationUpdatedAt}
                      lat={truck.lastLat}
                      lng={truck.lastLng}
                    />
                    {truck.media && truck.media.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {truck.media.map((m) =>
                          m.type === "IMAGE" ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img key={m.id} src={m.url} alt={m.fileName ?? "photo"} className="h-20 w-20 rounded-md object-cover" />
                          ) : (
                            <video key={m.id} src={m.url} controls className="h-20 rounded-md" />
                          )
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </details>
          );
        })}
      </div>
    </>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="text-slate-700">{value || "—"}</dd>
    </div>
  );
}
