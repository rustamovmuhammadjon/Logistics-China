import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { formatDate, formatDirection, subOrderStatusLabel, truckStats, type CommentDto, type GroupOrderDto, type SubOrderDto, type TruckDto } from "@logistics/shared";
import { serverApiOrNull } from "@/lib/server-api";
import { CommentsSection } from "@/components/CommentsSection";
import { AdminOrderForms } from "./AdminOrderForms";

export const dynamic = "force-dynamic";

type AdminOrder = GroupOrderDto & {
  comments: CommentDto[];
  subOrders: (SubOrderDto & { trucks: TruckDto[] })[];
};

export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await serverApiOrNull<{ order: AdminOrder }>(`/api/admin/orders/${id}`);
  if (!data) notFound();
  const order = data.order;

  return (
    <div className="space-y-6">
        <Link href="/admin/orders" className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline">
          <ArrowLeft className="h-4 w-4" />
          All orders
        </Link>

        <div className="card space-y-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">{order.name}</h1>
            {formatDirection(order.origin, order.destination) && (
              <p className="text-sm text-slate-500">{formatDirection(order.origin, order.destination)}</p>
            )}
          </div>
          <AdminOrderForms order={order} />
          <CommentsSection target={{ level: "group", groupOrderId: order.id }} comments={order.comments ?? []} />
        </div>

        <div>
          <h2 className="mb-3 text-lg font-semibold text-slate-900">Sub-orders</h2>
          {order.subOrders.length === 0 ? (
            <p className="card text-center text-slate-400">No sub-orders yet.</p>
          ) : (
            <ul className="space-y-3">
              {order.subOrders.map((sub) => {
                const stats = truckStats(sub.trucks);
                return (
                  <li key={sub.id}>
                    <Link href={`/admin/orders/${order.id}/suborders/${sub.id}`} className="card block hover:border-brand-300">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="font-medium text-slate-900">{sub.name || "Sub-order"}</span>
                          <span className="ml-2 text-xs text-slate-400">
                            Opened {formatDate(sub.openedAt)}
                            {sub.status === "CLOSED" && sub.arrivedAt ? ` · Completed ${formatDate(sub.arrivedAt)}` : ""}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span className={sub.status === "CANCELED" ? "badge-red" : sub.status === "CLOSED" ? "badge-slate" : "badge-green"}>
                            {subOrderStatusLabel(sub.status)}
                          </span>
                          <span className="badge-slate">{stats.total} trucks</span>
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    
  );
}
