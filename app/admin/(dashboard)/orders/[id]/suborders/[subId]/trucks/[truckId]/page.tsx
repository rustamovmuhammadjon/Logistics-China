import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatDate, formatDateTime } from "@/lib/stats";
import {
  deleteTruckAction,
  updateTruckAction,
  updateTruckPaymentAction,
} from "@/lib/actions/trucks";
import { deleteMediaAction } from "@/lib/actions/media";
import { CommentsSection } from "@/app/components/CommentsSection";
import { ConfirmSubmitButton } from "@/app/components/ConfirmSubmitButton";
import { MediaUploader } from "@/app/components/MediaUploader";

export const dynamic = "force-dynamic";

export default async function TruckPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; subId: string; truckId: string }>;
  searchParams: Promise<{ truckError?: string }>;
}) {
  const { id, subId, truckId } = await params;
  const { truckError } = await searchParams;

  const truck = await prisma.truck.findUnique({
    where: { id: truckId },
    include: {
      subOrder: { include: { groupOrder: true } },
      media: { orderBy: { createdAt: "desc" } },
      comments: { orderBy: { createdAt: "desc" } },
      transfersFrom: { include: { toTruck: true } },
      transfersTo: { include: { fromTruck: true } },
    },
  });

  if (!truck || truck.subOrderId !== subId || truck.subOrder.groupOrderId !== id) {
    notFound();
  }

  const updateAction = updateTruckAction.bind(null, id, subId, truck.id);
  const deleteAction = deleteTruckAction.bind(null, id, subId, truck.id);
  const setDriverPaid = updateTruckPaymentAction.bind(null, id, subId, truck.id, "driverPaymentStatus", "PAID");
  const setDriverNotPaid = updateTruckPaymentAction.bind(null, id, subId, truck.id, "driverPaymentStatus", "NOT_PAID");
  const setCustomerPaid = updateTruckPaymentAction.bind(null, id, subId, truck.id, "customerPaymentStatus", "PAID");
  const setCustomerNotPaid = updateTruckPaymentAction.bind(null, id, subId, truck.id, "customerPaymentStatus", "NOT_PAID");

  return (
    <div className="space-y-6">
      <Link href={`/admin/orders/${id}/suborders/${subId}`} className="text-sm text-brand-600 hover:underline">
        ← {truck.subOrder.groupOrder.name} / {truck.subOrder.name || "Sub-order"}
      </Link>

      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-900">
            {truck.plateNumber || "Truck"}
          </h1>
          <form action={deleteAction}>
            <ConfirmSubmitButton confirmText="Delete this truck and all its photos/videos/comments?">
              Delete truck
            </ConfirmSubmitButton>
          </form>
        </div>

        <div className="flex flex-wrap gap-3">
          <PaymentToggle
            label="Driver payment"
            status={truck.driverPaymentStatus}
            markPaid={setDriverPaid}
            markNotPaid={setDriverNotPaid}
          />
          <PaymentToggle
            label="Customer payment"
            status={truck.customerPaymentStatus}
            markPaid={setCustomerPaid}
            markNotPaid={setCustomerNotPaid}
          />
        </div>

        {truckError && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {truckError}
          </p>
        )}

        <form action={updateAction} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="field-label">Truck plate number</label>
            <input className="field-input" type="text" name="plateNumber" defaultValue={truck.plateNumber ?? ""} />
          </div>
          <div>
            <label className="field-label">Trailer plate number</label>
            <input
              className="field-input"
              type="text"
              name="trailerPlateNumber"
              defaultValue={truck.trailerPlateNumber ?? ""}
            />
          </div>
          <div>
            <label className="field-label">Driver name</label>
            <input className="field-input" type="text" name="driverName" defaultValue={truck.driverName ?? ""} />
          </div>
          <div>
            <label className="field-label">Driver phone</label>
            <input className="field-input" type="text" name="driverPhone" defaultValue={truck.driverPhone ?? ""} />
          </div>
          <div>
            <label className="field-label">Length (m)</label>
            <input
              className="field-input"
              type="number"
              step="0.01"
              name="lengthM"
              defaultValue={truck.lengthM ?? ""}
            />
          </div>
          <div>
            <label className="field-label">Width (m)</label>
            <input
              className="field-input"
              type="number"
              step="0.01"
              name="widthM"
              defaultValue={truck.widthM ?? ""}
            />
          </div>
          <div>
            <label className="field-label">Height (m)</label>
            <input
              className="field-input"
              type="number"
              step="0.01"
              name="heightM"
              defaultValue={truck.heightM ?? ""}
            />
          </div>
          <div>
            <label className="field-label">Cargo weight (kg)</label>
            <input
              className="field-input"
              type="number"
              step="0.01"
              name="cargoWeight"
              defaultValue={truck.cargoWeight ?? ""}
            />
          </div>
          <div>
            <label className="field-label">Cargo description</label>
            <input
              className="field-input"
              type="text"
              name="cargoDescription"
              defaultValue={truck.cargoDescription ?? ""}
            />
          </div>
          <div className="sm:col-span-3">
            <label className="field-label">Current location</label>
            <input
              className="field-input"
              type="text"
              name="currentLocation"
              defaultValue={truck.currentLocation ?? ""}
            />
            <p className="mt-1 text-xs text-slate-400">
              Last updated: {formatDateTime(truck.locationUpdatedAt)}
            </p>
          </div>
          <div className="sm:col-span-3">
            <button type="submit" className="btn-primary">
              Save changes
            </button>
          </div>
        </form>

        {(truck.transfersFrom.length > 0 || truck.transfersTo.length > 0) && (
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-sm text-slate-600 space-y-1">
            {truck.transfersTo.map((t) => (
              <p key={t.id}>
                ↩ Cargo received from truck <strong>{t.fromTruck.plateNumber || "—"}</strong> on{" "}
                {formatDate(t.transferDate)}
              </p>
            ))}
            {truck.transfersFrom.map((t) => (
              <p key={t.id}>
                ↪ Cargo transferred to truck <strong>{t.toTruck.plateNumber || "—"}</strong> on{" "}
                {formatDate(t.transferDate)}
              </p>
            ))}
            <p className="text-xs text-slate-400">
              Manage transfers from the sub-order page.
            </p>
          </div>
        )}
      </div>

      <div className="card space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Photos & videos</h2>
        <MediaUploader groupOrderId={id} subOrderId={subId} truckId={truck.id} />

        {truck.media.length === 0 ? (
          <p className="text-sm text-slate-400">No media uploaded yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {truck.media.map((m) => {
              const del = deleteMediaAction.bind(null, id, subId, truck.id, m.id);
              return (
                <div key={m.id} className="space-y-1">
                  {m.type === "IMAGE" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.url} alt={m.fileName ?? "photo"} className="h-32 w-full rounded-lg object-cover" />
                  ) : (
                    <video src={m.url} controls className="h-32 w-full rounded-lg" />
                  )}
                  <form action={del}>
                    <ConfirmSubmitButton
                      confirmText="Delete this file?"
                      className="w-full text-xs text-red-500 hover:text-red-700"
                    >
                      Delete
                    </ConfirmSubmitButton>
                  </form>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="card">
        <CommentsSection
          target={{ level: "truck", groupOrderId: id, subOrderId: subId, truckId: truck.id }}
          comments={truck.comments}
        />
      </div>
    </div>
  );
}

function PaymentToggle({
  label,
  status,
  markPaid,
  markNotPaid,
}: {
  label: string;
  status: "PAID" | "NOT_PAID";
  markPaid: () => Promise<void>;
  markNotPaid: () => Promise<void>;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
      <span className="text-sm font-medium text-slate-700">{label}:</span>
      <span className={status === "PAID" ? "badge-green" : "badge-amber"}>
        {status === "PAID" ? "Paid" : "Not paid"}
      </span>
      {status === "PAID" ? (
        <form action={markNotPaid}>
          <button type="submit" className="text-xs text-slate-500 hover:text-slate-800 underline">
            Mark not paid
          </button>
        </form>
      ) : (
        <form action={markPaid}>
          <button type="submit" className="text-xs text-brand-600 hover:text-brand-800 underline">
            Mark paid
          </button>
        </form>
      )}
    </div>
  );
}
