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
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="badge-slate">{stats.total} trucks</span>
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <Field label="POL" value={order.pol} />
          <Field label="Commodity" value={order.commodity} />
          <Field label="Volume" value={formatVolume(order.subOrders.length)} />
        </dl>
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
                      {sub.status === "CLOSED" && sub.arrivedAt ? ` · Completed ${formatDate(sub.arrivedAt)}` : ""}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <span className={sub.status === "CANCELED" ? "badge-red" : sub.status === "CLOSED" ? "badge-slate" : "badge-green"}>
                      {subOrderStatusLabel(sub.status)}
                    </span>
                    <span className="badge-slate">{subStats.total} trucks</span>
                  </div>
                </div>
              </summary>

              <div className="mt-4">
                <SubOrderLocation trucks={sub.trucks} />
              </div>

              {sub.comments && sub.comments.length > 0 && (
                <ul className="mt-4 space-y-2">
                  {sub.comments.map((c) => (
                    <li key={c.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                      <p className="whitespace-pre-wrap text-slate-800">{c.text}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {c.author ? `${c.author} · ` : ""}
                        {formatDateTime(c.createdAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-4 space-y-3">
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
