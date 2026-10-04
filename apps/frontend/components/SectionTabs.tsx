"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type SectionTab = { href: string; label: string; icon?: React.ReactNode; count?: number };

// Sub-sections of a page (Chat → Drivers, Drivers → Global / My) — a quiet
// segmented control under the page title.
export function SectionTabs({ tabs }: { tabs: SectionTab[] }) {
  const pathname = usePathname();
  return (
    <div className="inline-flex max-w-full gap-1 overflow-x-auto rounded-xl border border-slate-200/80 bg-white p-1">
      {tabs.map((tab) => {
        const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            prefetch
            className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-1.5 text-sm transition ${
              active ? "bg-brand-600 font-semibold text-white shadow-sm" : "font-medium text-slate-600 hover:bg-slate-100"
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.count != null && (
              <span
                className={`rounded-full px-1.5 text-xs font-semibold ${
                  active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                }`}
              >
                {tab.count}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  icon,
  actions,
}: {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex min-w-0 items-start gap-3">
        {icon && (
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
          {description && <p className="mt-0.5 max-w-2xl text-sm text-slate-500">{description}</p>}
        </div>
      </div>
      {actions}
    </div>
  );
}
