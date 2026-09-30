import { Suspense } from "react";
import { TickCircle } from "iconsax-react";
import { withOwnOrders, type MonitoringResponse } from "@logistics/shared";
import { serverApiSafe } from "@/lib/server-api";
import { MonitoringView } from "@/components/MonitoringView";
import { DbError } from "@/components/DbError";
import { MonitoringTabs } from "@/components/MonitoringTabs";
import { ResultsSkeleton } from "@/components/ResultsSkeleton";

export const dynamic = "force-dynamic";

export default function CompletedOrdersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Completed orders</h1>
        <p className="text-sm text-slate-500">
          Orders whose sub-orders are all completed. Hidden from the main monitoring page.
        </p>
      </div>

      <MonitoringTabs />

      <Suspense fallback={<ResultsSkeleton />}>
        <CompletedResults />
      </Suspense>
    </div>
  );
}

async function CompletedResults() {
  const { data, error } = await serverApiSafe<MonitoringResponse>("/api/monitoring/orders?completed=1");
  const scoped = data ? withOwnOrders(data, data.user) : null;

  if (error || !scoped) {
    return <DbError message={error || "Backend did not return orders."} />;
  }

  return (
    <MonitoringView
      orders={scoped.orders}
      ctx={scoped.ctx}
      exportHref="/api/monitoring/export?completed=1"
      statIcon={<TickCircle size={20} variant="Bold" />}
      emptyIcon={<TickCircle size={36} variant="Bold" />}
      emptyTitle="No completed sub-orders yet."
      emptySearchTitle="No completed sub-orders match your search."
    />
  );
}
