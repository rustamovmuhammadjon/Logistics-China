"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Activity, LayoutDashboard, Plus, Shield, ShoppingBag, Users } from "lucide-react";
import { Truck } from "iconsax-react";
import {
  displayName,
  getOrderHref,
  ownOrdersOnly,
  roleLabel,
  type SidebarOrderDto,
  type ViewerContext,
  type UserPublic,
} from "@logistics/shared";
import { Avatar } from "./Avatar";

type ShellData = {
  orders: SidebarOrderDto[];
  ctx: ViewerContext;
  admin: boolean;
  user: UserPublic | null;
};

const emptyShell: ShellData = {
  orders: [],
  ctx: { kind: "guest" },
  admin: false,
  user: null,
};

let memoryCache: { data: ShellData; at: number } | null = null;

async function loadShell(): Promise<ShellData> {
  const res = await fetch("/api/monitoring/sidebar", { credentials: "include", cache: "no-store" });
  if (!res.ok) return emptyShell;
  return (await res.json()) as ShellData;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [data, setData] = useState<ShellData>(memoryCache?.data ?? emptyShell);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fresh = memoryCache && Date.now() - memoryCache.at < 20_000;
    if (fresh && memoryCache) {
      setData(memoryCache.data);
    }

    loadShell()
      .then((next) => {
        if (cancelled) return;
        memoryCache = { data: next, at: Date.now() };
        setData(next);
        setError(false);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const { orders, ctx, admin, user } = data;
  const visibleOrders = ownOrdersOnly(orders, user, ctx);
  const name = user ? displayName(user) : admin ? "Admin" : "";

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1920px] flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex flex-wrap items-center gap-1">
            <Link href="/" className="mr-3 flex items-center gap-2 font-bold text-ink-900">
              <Truck size={22} variant="Bold" color="#1d4e89" />
              China–Iran Logistics
            </Link>
            <NavLink href="/" icon={<Activity className="h-4 w-4" />} match={["/", "/completed", "/cancelled"]}>
              Monitoring
            </NavLink>
            {(user?.role === "CONSIGNEE" || user?.role === "COMPANY" || user?.role === "EMPLOYEE") && (
              <NavLink href="/orders" icon={<ShoppingBag className="h-4 w-4" />}>
                Orders
              </NavLink>
            )}
            {user?.role === "COMPANY" && (
              <NavLink href="/employees" icon={<Users className="h-4 w-4" />}>
                Employees
              </NavLink>
            )}
            {(user?.role === "OPERATOR" || user?.role === "COMPANY") && (
              <NavLink href="/dashboard" icon={<LayoutDashboard className="h-4 w-4" />}>
                {user.role === "COMPANY" ? "Dashboard" : "My dashboard"}
              </NavLink>
            )}
            {admin && (
              <NavLink href="/admin" icon={<Shield className="h-4 w-4" />}>
                Admin panel
              </NavLink>
            )}
          </div>

          {(user || admin) && (
            <Link href="/profile" className="flex items-center gap-2">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium leading-tight text-slate-900">{name || "…"}</p>
                <p className="text-xs leading-tight text-slate-500">{user ? roleLabel(user.role) : "Admin"}</p>
              </div>
              <Avatar
                photoUrl={user?.photoUrl}
                firstName={user?.firstName}
                lastName={user?.lastName}
                email={user?.email ?? "admin"}
              />
            </Link>
          )}
        </div>
      </nav>

      <div className="flex flex-col lg:flex-row">
        <aside className="w-full shrink-0 border-b border-slate-200 bg-white lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:w-52 lg:overflow-y-auto lg:border-b-0 lg:border-r lg:border-slate-200">
          <div className="px-4 pb-6 pt-3">
            {(user?.role === "CONSIGNEE" || user?.role === "EMPLOYEE") && (
              <Link href="/orders/new" className="btn-primary mb-4 w-full">
                <Plus className="h-4 w-4" />
                New order
              </Link>
            )}
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Active orders</h2>
            {visibleOrders.length === 0 ? (
              <p className="text-sm text-slate-400">{error ? "Orders unavailable." : "No active orders."}</p>
            ) : (
              <ul className="max-h-[70vh] space-y-1 overflow-y-auto lg:max-h-none">
                {visibleOrders.map((order) => (
                  <li key={order.id}>
                    <Link
                      href={getOrderHref(order, ctx)}
                      prefetch
                      className="block truncate rounded-lg px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
                      title={order.name}
                    >
                      {order.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
        <main className="min-w-0 flex-1 px-4 py-8">{children}</main>
      </div>
    </div>
  );
}

function NavLink({
  href,
  icon,
  children,
  match,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  match?: string[];
}) {
  const pathname = usePathname();
  const paths = match ?? [href];
  const active = paths.some((path) => (path === "/" ? pathname === "/" : pathname.startsWith(path)));
  return (
    <Link
      href={href}
      prefetch
      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm ${
        active ? "bg-slate-100 font-medium text-slate-900" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      }`}
    >
      {icon}
      {children}
    </Link>
  );
}
