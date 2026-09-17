import { Box1, People, Timer1, TickCircle } from "iconsax-react";
import { Ban } from "lucide-react";
import type { CompanyAnalyticsDto } from "@logistics/shared";
import { StatCard } from "@/components/StatCard";

function monthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

export function CompanyAnalytics({ data }: { data: CompanyAnalyticsDto }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">An overview of your company's employees and order activity.</p>
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Employees" value={data.employeeCount} icon={<People size={20} variant="Bold" />} />
        <StatCard label="Active employees" value={data.activeEmployeeCount} icon={<People size={20} variant="Bold" />} />
        <StatCard label="Active orders" value={data.orders.active} icon={<Box1 size={20} variant="Bold" />} />
        <StatCard label="Completed orders" value={data.orders.completed} icon={<TickCircle size={20} variant="Bold" />} />
        <StatCard label="Cancelled orders" value={data.orders.cancelled} icon={<Ban className="h-5 w-5" />} />
        <StatCard
          label="Avg. days to complete"
          value={data.avgDaysToComplete != null ? data.avgDaysToComplete.toFixed(1) : "—"}
          icon={<Timer1 size={20} variant="Bold" />}
        />
      </section>

      <div className="card">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Monthly activity</h2>
        {data.monthly.length === 0 ? (
          <p className="text-sm text-slate-400">No orders yet.</p>
        ) : (
          <div className="-mx-4 overflow-x-auto border-y border-slate-200 bg-white">
            <table className="w-full min-w-[480px] table-fixed">
              <colgroup>
                <col style={{ width: "40%" }} />
                <col style={{ width: "20%" }} />
                <col style={{ width: "20%" }} />
                <col style={{ width: "20%" }} />
              </colgroup>
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2 text-[11px]">Month</th>
                  <th className="px-3 py-2 text-[11px]">Created</th>
                  <th className="px-3 py-2 text-[11px]">Completed</th>
                  <th className="px-3 py-2 text-[11px]">Cancelled</th>
                </tr>
              </thead>
              <tbody>
                {[...data.monthly].reverse().map((row) => (
                  <tr key={row.month} className="border-b border-slate-100 last:border-0">
                    <td className="px-3 py-2 text-xs font-medium text-slate-800">{monthLabel(row.month)}</td>
                    <td className="px-3 py-2 text-xs text-slate-600">{row.created}</td>
                    <td className="px-3 py-2 text-xs text-slate-600">{row.completed}</td>
                    <td className="px-3 py-2 text-xs text-slate-600">{row.cancelled}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
