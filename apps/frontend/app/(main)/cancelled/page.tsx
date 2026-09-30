import { Suspense } from "react";
import { CloseCircle } from "iconsax-react";
import { withOwnOrders, type MonitoringResponse } from "@logistics/shared";
import { serverApiSafe } from "@/lib/server-api";
import { MonitoringView } from "@/components/MonitoringView";
import { DbError } from "@/components/DbError";
import { MonitoringTabs } from "@/components/MonitoringTabs";
import { ResultsSkeleton } from "@/components/ResultsSkeleton";

export const dynamic = "force-dynamic";

export default function CancelledOrdersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Cancelled orders</h1>
        <p className="text-sm text-slate-500">
          Group orders that were cancelled. They are hidden from monitoring. Cancelled sub-orders stay inside their
          parent order and do not move a whole order here.
        </p>
      </div>

      <MonitoringTabs />

      <Suspense fallback={<ResultsSkeleton />}>
        <CancelledResults />
      </Suspense>
    </div>
  );
}

async function CancelledResults() {
  const { data, error } = await serverApiSafe<MonitoringResponse>("/api/monitoring/orders?canceled=1");
  const scoped = data ? withOwnOrders(data, data.user) : null;

  if (error || !scoped) {
    return <DbError message={error || "Backend did not return orders."} />;
  }

  return (
    <MonitoringView
      orders={scoped.orders}
      ctx={scoped.ctx}
      exportHref="/api/monitoring/export?canceled=1"
      statIcon={<CloseCircle size={20} variant="Bold" />}
      emptyIcon={<CloseCircle size={36} variant="Bold" />}
      emptyTitle="No cancelled orders yet."
      emptySearchTitle="No cancelled orders match your search."
    />
  );
}
