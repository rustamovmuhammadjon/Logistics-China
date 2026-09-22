import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { formatDate, formatDateTime, formatDirection, formatVolume, subOrderStatusLabel, truckStats, type GroupOrderDto } from "@logistics/shared";
import { serverApiOrNull } from "@/lib/server-api";
import { CargoTransferForm } from "@/components/CargoTransferForm";
import { SubOrderLocation, TruckSequence, transferHistory } from "@/components/TruckReadout";

export const dynamic = "force-dynamic";

export default async function TrackOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await serverApiOrNull<{ order: GroupOrderDto }>(`/api/monitoring/orders/${id}`);
  if (!data) notFound();
  const order = data.order;
  const stats = truckStats(order.subOrders.flatMap((s) => s.trucks));

  return (
    <div className="mx-auto max-w-4xl">
    <Link href="/" className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline">
        <ArrowLeft className="h-4 w-4" />
        All orders
      </Link>

      <header className="card mb-4 mt-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{order.name}</h1>
            {formatDirection(order.origin, order.destination) && (
              <p className="text-sm text-slate-600">{formatDirection(order.origin, order.destination)}</p>
            )}
            <p className="text-xs text-slate-400">
              Opened {formatDate(order.openedAt)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="badge-slate">{stats.total} trucks</span>
          </div>
        </div>

        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
          <Field label="POL" value={order.pol} />
          <Field label="Commodity" value={order.commodity} />
          <Field label="Volume" value={formatVolume(order.subOrders.length)} />
        </dl>
      </header>

      <h2 className="mb-2 text-lg font-semibold text-slate-900">Sub-orders</h2>
      <div className="space-y-2">
        {order.subOrders.length === 0 && <p className="card text-center text-slate-400">No sub-orders yet.</p>}
        {order.subOrders.map((sub) => {
          const subStats = truckStats(sub.trucks);
          return (
            <details key={sub.id} className="card p-4" open={order.subOrders.length === 1}>
              <summary className="cursor-pointer list-none">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-semibold text-slate-900">{sub.name || "Sub-order"}</span>
                    <span className="ml-2 text-xs text-slate-400">
                      Opened {formatDate(sub.openedAt)}
                      {sub.status === "CLOSED" && sub.arrivedAt ? ` · Completed ${formatDate(sub.arrivedAt)}` : ""}
                      {` · ${subStats.total} truck${subStats.total === 1 ? "" : "s"}`}
                    </span>
                  </div>
                  <span className={sub.status === "CANCELED" ? "badge-red" : sub.status === "CLOSED" ? "badge-slate" : "badge-green"}>
                    {subOrderStatusLabel(sub.status)}
                  </span>
                </div>
              </summary>

              <div className="mt-3 space-y-3">
                <SubOrderLocation trucks={sub.trucks} />

                {sub.comments && sub.comments.length > 0 && (
                  <ul className="space-y-1.5">
                    {sub.comments.map((c) => (
                      <li key={c.id} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
                        <p className="whitespace-pre-wrap text-slate-800">{c.text}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          {c.author ? `${c.author} · ` : ""}
                          {formatDateTime(c.createdAt)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}

                <TruckSequence trucks={sub.trucks} />
                <CargoTransferForm
                  apiBase=""
                  trucks={[]}
                  transfers={transferHistory(sub.trucks)}
                  readOnly
                />
              </div>
            </details>
          );
        })}
      </div>
    </div>
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
