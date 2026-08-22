import { Plus } from "lucide-react";
import { Box1 } from "iconsax-react";
import type { GroupOrderDto } from "@logistics/shared";
import { serverApi } from "@/lib/server-api";
import { EmptyState } from "@/components/EmptyState";
import { OrderCard } from "@/components/OrderCard";
import { AdminNewOrderForm } from "../AdminNewOrderForm";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const { orders } = await serverApi<{ orders: GroupOrderDto[] }>("/api/admin/orders");

  return (
    <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Orders</h1>
          <p className="text-sm text-slate-500">All group orders, with the owning consignee and linked operators.</p>
        </div>

        <details className="card">
          <summary className="flex cursor-pointer items-center gap-2 font-semibold text-slate-800">
            <Plus className="h-4 w-4" />
            New group order
          </summary>
          <div className="mt-4">
            <AdminNewOrderForm />
          </div>
        </details>

        {orders.length === 0 ? (
          <EmptyState icon={<Box1 size={36} variant="Bold" />} title="No orders yet." />
        ) : (
          <ul className="space-y-3">
            {orders.map((order) => (
              <li key={order.id}>
                <OrderCard order={order} ctx={{ kind: "admin" }} />
              </li>
            ))}
          </ul>
        )}
      </div>
    
  );
}
