import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  formatDate,
  formatDateTime,
  subOrderStatusLabel,
  type CommentDto,
  type CargoTransferDto,
  type GroupOrderDto,
  type SubOrderDto,
  type TruckDto,
} from "@logistics/shared";
import { serverApiOrNull } from "@/lib/server-api";
import { CommentsSection } from "@/components/CommentsSection";
import { PaymentBadge } from "@/components/PaymentBadge";
import { AdminSubOrderForms } from "./AdminSubOrderForms";

export const dynamic = "force-dynamic";

type AdminSub = SubOrderDto & {
  groupOrder: Pick<GroupOrderDto, "id" | "name">;
  comments: CommentDto[];
  trucks: (TruckDto & { transfersFrom: CargoTransferDto[]; transfersTo: CargoTransferDto[] })[];
};

export default async function AdminSubOrderPage({ params }: { params: Promise<{ id: string; subId: string }> }) {
  const { id, subId } = await params;
  const data = await serverApiOrNull<{ subOrder: AdminSub }>(`/api/admin/orders/${id}/sub-orders/${subId}`);
  if (!data) notFound();
  const sub = data.subOrder;

  return (
    <div className="space-y-6">
        <Link href={`/admin/orders/${id}`} className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline">
          <ArrowLeft className="h-4 w-4" />
          {sub.groupOrder.name}
        </Link>

        <div className="card space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">{sub.name || "Sub-order"}</h1>
            <span className={sub.status === "CANCELED" ? "badge-red" : sub.status === "CLOSED" ? "badge-slate" : "badge-green"}>
              {subOrderStatusLabel(sub.status)}
            </span>
            {sub.status === "CLOSED" && sub.arrivedAt ? (
              <span className="text-xs text-slate-400">Completed {formatDate(sub.arrivedAt)}</span>
            ) : null}
          </div>
          <AdminSubOrderForms orderId={id} sub={sub} />
          <CommentsSection target={{ level: "sub", groupOrderId: id, subOrderId: sub.id }} comments={sub.comments ?? []} />
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
                    className="card block hover:border-brand-300"
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
                            {truck.currentLocation}{" "}
                            <span className="text-xs text-slate-400">({formatDateTime(truck.locationUpdatedAt)})</span>
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
      </div>
    
  );
}
