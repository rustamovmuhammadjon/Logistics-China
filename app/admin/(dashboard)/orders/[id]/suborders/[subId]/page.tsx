import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatDate, formatDateTime } from "@/lib/stats";
import { deleteSubOrderAction, updateSubOrderAction } from "@/lib/actions/sub-orders";
import { createTruckAction } from "@/lib/actions/trucks";
import { createTransferAction, deleteTransferAction } from "@/lib/actions/transfers";
import { toDateInputValue } from "@/lib/form-utils";
import { CommentsSection } from "@/app/components/CommentsSection";
import { ConfirmSubmitButton } from "@/app/components/ConfirmSubmitButton";
import { PaymentBadge } from "@/app/components/PaymentBadge";

export const dynamic = "force-dynamic";

export default async function SubOrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; subId: string }>;
  searchParams: Promise<{ truckError?: string }>;
}) {
  const { id, subId } = await params;
  const { truckError } = await searchParams;

  const sub = await prisma.subOrder.findUnique({
    where: { id: subId },
    include: {
      groupOrder: true,
      comments: { orderBy: { createdAt: "desc" } },
      trucks: {
        orderBy: { createdAt: "asc" },
        include: {
          transfersFrom: { include: { toTruck: true } },
          transfersTo: { include: { fromTruck: true } },
        },
      },
    },
  });

  if (!sub || sub.groupOrderId !== id) notFound();

  const updateAction = updateSubOrderAction.bind(null, id, sub.id);
  const deleteAction = deleteSubOrderAction.bind(null, id, sub.id);
  const createTruck = createTruckAction.bind(null, id, sub.id);
  const createTransfer = createTransferAction.bind(null, id, sub.id);

  const transfers = sub.trucks.flatMap((t) => t.transfersFrom);

  return (
    <div className="space-y-6">
      <Link href={`/admin/orders/${id}`} className="text-sm text-brand-600 hover:underline">
        ← {sub.groupOrder.name}
      </Link>

      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">{sub.name || "Sub-order"}</h1>
            <span className={sub.status === "CLOSED" ? "badge-slate" : "badge-green"}>
              {sub.status === "CLOSED" ? "Closed" : "Open"}
            </span>
          </div>
          <form action={deleteAction}>
            <ConfirmSubmitButton confirmText="Delete this sub-order, including all its trucks?">
              Delete sub-order
            </ConfirmSubmitButton>
          </form>
        </div>

        <form action={updateAction} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="field-label">Name</label>
            <input className="field-input" type="text" name="name" defaultValue={sub.name ?? ""} />
          </div>
          <div>
            <label className="field-label">Opened date</label>
            <input
              className="field-input"
              type="date"
              name="openedAt"
              defaultValue={toDateInputValue(sub.openedAt)}
            />
          </div>
          <div>
            <label className="field-label">Arrived date</label>
            <input
              className="field-input"
              type="date"
              name="arrivedAt"
              defaultValue={toDateInputValue(sub.arrivedAt)}
            />
            <p className="mt-1 text-xs text-slate-400">Setting this closes the sub-order.</p>
          </div>
          <div className="sm:col-span-3">
            <button type="submit" className="btn-primary">
              Save changes
            </button>
          </div>
        </form>

        <CommentsSection
          target={{ level: "sub", groupOrderId: id, subOrderId: sub.id }}
          comments={sub.comments}
        />
      </div>

      <div className="card">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">New truck</h2>
        {truckError && (
          <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {truckError}
          </p>
        )}
        <form action={createTruck} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="field-label">Truck plate number</label>
            <input className="field-input" type="text" name="plateNumber" />
          </div>
          <div>
            <label className="field-label">Trailer plate number</label>
            <input className="field-input" type="text" name="trailerPlateNumber" />
          </div>
          <div>
            <label className="field-label">Driver name</label>
            <input className="field-input" type="text" name="driverName" />
          </div>
          <div>
            <label className="field-label">Driver phone</label>
            <input className="field-input" type="text" name="driverPhone" />
          </div>
          <div>
            <label className="field-label">Length (m)</label>
            <input className="field-input" type="number" step="0.01" name="lengthM" />
          </div>
          <div>
            <label className="field-label">Width (m)</label>
            <input className="field-input" type="number" step="0.01" name="widthM" />
          </div>
          <div>
            <label className="field-label">Height (m)</label>
            <input className="field-input" type="number" step="0.01" name="heightM" />
          </div>
          <div>
            <label className="field-label">Cargo weight (kg)</label>
            <input className="field-input" type="number" step="0.01" name="cargoWeight" />
          </div>
          <div>
            <label className="field-label">Cargo description</label>
            <input className="field-input" type="text" name="cargoDescription" />
          </div>
          <div className="sm:col-span-3">
            <label className="field-label">Current location</label>
            <input className="field-input" type="text" name="currentLocation" />
          </div>
          <div className="sm:col-span-3">
            <button type="submit" className="btn-primary">
              Add truck
            </button>
          </div>
        </form>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Trucks</h2>
        {sub.trucks.length === 0 ? (
          <p className="card text-center text-slate-400">No trucks yet.</p>
        ) : (
          <ul className="space-y-3">
            {sub.trucks.map((truck) => (
              <li key={truck.id}>
                <Link
                  href={`/admin/orders/${id}/suborders/${sub.id}/trucks/${truck.id}`}
                  className="card block hover:border-brand-300 hover:shadow-md"
                >
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
                      {truck.currentLocation && (
                        <p className="mt-1 text-sm text-slate-600">
                          📍 {truck.currentLocation}{" "}
                          <span className="text-xs text-slate-400">
                            ({formatDateTime(truck.locationUpdatedAt)})
                          </span>
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <PaymentBadge status={truck.driverPaymentStatus} label="Driver" />
                      <PaymentBadge status={truck.customerPaymentStatus} label="Customer" />
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <h2 className="mb-1 text-lg font-semibold text-slate-900">Cargo transfers (перекид)</h2>
        <p className="mb-3 text-xs text-slate-400">
          Record cargo moving from one truck to another. Both trucks must already exist in this
          sub-order.
        </p>

        {sub.trucks.length < 2 ? (
          <p className="text-sm text-slate-400">Add at least two trucks to record a transfer.</p>
        ) : (
          <form action={createTransfer} className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div>
              <label className="field-label">From truck</label>
              <select className="field-input" name="fromTruckId" required>
                {sub.trucks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.plateNumber || t.id.slice(0, 6)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">To truck</label>
              <select className="field-input" name="toTruckId" required>
                {sub.trucks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.plateNumber || t.id.slice(0, 6)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Transfer date</label>
              <input className="field-input" type="date" name="transferDate" />
            </div>
            <div>
              <label className="field-label">Comment</label>
              <input className="field-input" type="text" name="comment" />
            </div>
            <div className="sm:col-span-4">
              <button type="submit" className="btn-primary">
                Record transfer
              </button>
            </div>
          </form>
        )}

        {transfers.length > 0 && (
          <ul className="mt-4 space-y-2">
            {transfers.map((t) => {
              const del = deleteTransferAction.bind(null, id, sub.id, t.id);
              return (
                <li
                  key={t.id}
                  className="flex items-center justify-between rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-sm"
                >
                  <span>
                    <strong>{t.toTruck.plateNumber || "?"}</strong> received cargo from truck on{" "}
                    {formatDate(t.transferDate)}
                    {t.comment ? ` — ${t.comment}` : ""}
                  </span>
                  <form action={del}>
                    <ConfirmSubmitButton
                      confirmText="Delete this transfer record?"
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Delete
                    </ConfirmSubmitButton>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
