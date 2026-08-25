import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { CargoTransferDto, MediaDto, TruckDto } from "@logistics/shared";
import { formatDate, hasTransferredOut } from "@logistics/shared";
import { serverApiOrNull } from "@/lib/server-api";
import { MediaUploader } from "@/components/MediaUploader";
import { AdminTruckForms } from "./AdminTruckForms";
import { MediaGrid } from "./MediaGrid";

export const dynamic = "force-dynamic";

type AdminTruck = TruckDto & {
  media: MediaDto[];
  transfersFrom: CargoTransferDto[];
  transfersTo: CargoTransferDto[];
  subOrder: { id: string; name: string | null; groupOrderId: string; groupOrder: { name: string } };
};

export default async function AdminTruckPage({
  params,
}: {
  params: Promise<{ id: string; subId: string; truckId: string }>;
}) {
  const { id, subId, truckId } = await params;
  const data = await serverApiOrNull<{ truck: AdminTruck }>(
    `/api/admin/orders/${id}/sub-orders/${subId}/trucks/${truckId}`
  );
  if (!data) notFound();
  const truck = data.truck;
  const frozen = Boolean(truck.canceledAt) || hasTransferredOut(truck);

  return (
    <div className="space-y-6">
        <Link
          href={`/admin/orders/${id}/suborders/${subId}`}
          className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          {truck.subOrder.groupOrder.name} / {truck.subOrder.name || "Sub-order"}
        </Link>

        <div className="card space-y-4">
          <h1 className="text-xl font-bold text-slate-900">{truck.plateNumber || "Truck"}</h1>
          <AdminTruckForms orderId={id} subId={subId} truck={truck} />
          {(truck.transfersFrom.length > 0 || truck.transfersTo.length > 0) && (
            <div className="space-y-1 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
              {truck.transfersTo.map((t) => (
                <p key={t.id}>
                  Cargo received from truck <strong>{t.fromTruck?.plateNumber || "—"}</strong> on{" "}
                  {formatDate(t.transferDate)}
                </p>
              ))}
              {truck.transfersFrom.map((t) => (
                <p key={t.id}>
                  Cargo transferred to truck <strong>{t.toTruck?.plateNumber || "—"}</strong> on{" "}
                  {formatDate(t.transferDate)}
                </p>
              ))}
            </div>
          )}
        </div>

        <div className="card space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Photos & videos</h2>
          {!frozen && <MediaUploader groupOrderId={id} subOrderId={subId} truckId={truck.id} />}
          {truck.media.length === 0 ? (
            <p className="text-sm text-slate-400">No media uploaded yet.</p>
          ) : (
            <MediaGrid media={truck.media} />
          )}
        </div>
      </div>
    
  );
}
