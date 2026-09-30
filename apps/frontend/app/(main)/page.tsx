import { Suspense } from "react";
import { Box1 } from "iconsax-react";
import { withOwnOrders, type MonitoringResponse } from "@logistics/shared";
import { serverApiSafe } from "@/lib/server-api";
import { MonitoringView } from "@/components/MonitoringView";
import { DbError } from "@/components/DbError";
import { MonitoringTabs } from "@/components/MonitoringTabs";
import { ResultsSkeleton } from "@/components/ResultsSkeleton";

export const dynamic = "force-dynamic";

export default function MonitoringPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Monitoring</h1>
        <p className="text-sm text-slate-500">Live overview of every active order and truck.</p>
      </div>

      <MonitoringTabs />

      <Suspense fallback={<ResultsSkeleton />}>
        <MonitoringResults />
      </Suspense>
    </div>
  );
}

async function MonitoringResults() {
  const { data, error } = await serverApiSafe<MonitoringResponse>("/api/monitoring/orders");
  const scoped = data ? withOwnOrders(data, data.user) : null;

  if (error || !scoped) {
    return <DbError message={error || "Backend did not return orders."} />;
  }

  return (
    <MonitoringView
      orders={scoped.orders}
      ctx={scoped.ctx}
      exportHref="/api/monitoring/export"
      statIcon={<Box1 size={20} variant="Bold" />}
      emptyIcon={<Box1 size={36} variant="Bold" />}
      emptyTitle="No active sub-orders."
      emptySearchTitle="No active sub-orders match your search."
    />
  );
}
