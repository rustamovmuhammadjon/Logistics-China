"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Active" },
  { href: "/completed", label: "Completed" },
  { href: "/cancelled", label: "Cancelled" },
];

export function MonitoringTabs() {
  const pathname = usePathname();

  return (
    <div className="flex gap-1 border-b border-slate-200">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded-t-lg px-3 py-2 text-sm ${
              active
                ? "border-b-2 border-brand-600 font-medium text-brand-700"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
