"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Box1, Profile2User } from "iconsax-react";

const items = [
  { href: "/admin/users", label: "Users", icon: Profile2User },
  { href: "/admin/orders", label: "Orders", icon: Box1 },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-full shrink-0 lg:w-56">
      <nav className="card space-y-1 lg:sticky lg:top-24">
        <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Admin</p>
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium ${
                active ? "bg-brand-600 text-white" : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              <Icon size={18} variant="Bold" color={active ? "#ffffff" : "#1d4e89"} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
