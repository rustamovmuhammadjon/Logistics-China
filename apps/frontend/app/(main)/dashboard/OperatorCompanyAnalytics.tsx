import { Link as LinkIcon, People } from "iconsax-react";
import type { OperatorCompanyAnalyticsDto } from "@logistics/shared";
import { StatCard } from "@/components/StatCard";

export function OperatorCompanyAnalytics({ data }: { data: OperatorCompanyAnalyticsDto }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">An overview of your company's operators.</p>
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Operators" value={data.operatorCount} icon={<People size={20} variant="Bold" />} />
        <StatCard label="Active operators" value={data.activeOperatorCount} icon={<People size={20} variant="Bold" />} />
        <StatCard label="Linked accounts" value={data.totalLinkedAccounts} icon={<LinkIcon size={20} variant="Bold" />} />
      </section>
    </div>
  );
}
