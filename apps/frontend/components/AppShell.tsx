"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  ChevronRight,
  LayoutDashboard,
  Menu,
  MessagesSquare,
  Plus,
  Shield,
  ShoppingBag,
  Truck as TruckIcon,
  Users,
  X,
} from "lucide-react";
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
import { useRealtimeSync } from "@/lib/useRealtimeSync";
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

async function loadUnreadChats(): Promise<number> {
  const res = await fetch("/api/chats/unread-count", { credentials: "include", cache: "no-store" });
  if (!res.ok) return 0;
  return ((await res.json()) as { count: number }).count;
}

// Pages that need a live chat event (the Chat page) listen for this on
// window, so the whole app keeps a single socket.
export const CHAT_EVENT = "realtime:chat";

const MONITORING_PATHS = ["/", "/completed", "/cancelled"];

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  match?: string[];
  badge?: number;
};

function buildNav(user: UserPublic | null, admin: boolean, unreadChats: number) {
  const role = user?.role;
  const sections: { title: string; items: NavItem[] }[] = [
    {
      title: "Overview",
      items: [
        { href: "/", label: "Monitoring", icon: <Activity className="h-[18px] w-[18px]" />, match: MONITORING_PATHS },
        ...(role === "CONSIGNEE" || role === "COMPANY" || role === "EMPLOYEE"
          ? [{ href: "/orders", label: "Orders", icon: <ShoppingBag className="h-[18px] w-[18px]" /> }]
          : []),
        ...(role === "OPERATOR" || role === "COMPANY" || role === "OPERATOR_COMPANY"
          ? [
              {
                href: "/dashboard",
                label: role === "OPERATOR" ? "My dashboard" : "Dashboard",
                icon: <LayoutDashboard className="h-[18px] w-[18px]" />,
              },
            ]
          : []),
      ],
    },
    {
      title: "Communication",
      items:
        role === "OPERATOR"
          ? [{ href: "/chat", label: "Chat", icon: <MessagesSquare className="h-[18px] w-[18px]" />, badge: unreadChats }]
          : [],
    },
    {
      title: "Fleet",
      items:
        role === "OPERATOR_COMPANY" || (role === "OPERATOR" && user?.companyId)
          ? [{ href: "/drivers", label: "Drivers", icon: <TruckIcon className="h-[18px] w-[18px]" /> }]
          : [],
    },
    {
      title: "Team",
      items: [
        ...(role === "COMPANY" ? [{ href: "/employees", label: "Employees", icon: <Users className="h-[18px] w-[18px]" /> }] : []),
        ...(role === "OPERATOR_COMPANY"
          ? [{ href: "/operators", label: "Operators", icon: <Users className="h-[18px] w-[18px]" /> }]
          : []),
      ],
    },
    {
      title: "Admin",
      items: admin ? [{ href: "/admin", label: "Admin panel", icon: <Shield className="h-[18px] w-[18px]" /> }] : [],
    },
  ];
  return sections.filter((section) => section.items.length > 0);
}

function isActive(pathname: string, item: NavItem) {
  return (item.match ?? [item.href]).some((path) => (path === "/" ? pathname === "/" : pathname.startsWith(path)));
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [data, setData] = useState<ShellData>(memoryCache?.data ?? emptyShell);
  const [error, setError] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [unreadChats, setUnreadChats] = useState(0);
  const isMonitoringPage = MONITORING_PATHS.includes(pathname);
  const isOperator = data.user?.role === "OPERATOR";

  useEffect(() => {
    let cancelled = false;
    const fresh = memoryCache && Date.now() - memoryCache.at < 20_000;
    if (fresh && memoryCache) setData(memoryCache.data);

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

  // The drawer is a phone affordance — any navigation closes it.
  useEffect(() => setDrawerOpen(false), [pathname]);

  const refreshUnread = useCallback(() => {
    if (!isOperator) return;
    loadUnreadChats()
      .then(setUnreadChats)
      .catch(() => undefined);
  }, [isOperator]);

  useEffect(() => {
    refreshUnread();
  }, [refreshUnread, pathname]);

  // A single realtime connection for the whole app: shared changes refresh
  // the page and the sidebar; a chat event only updates chat.
  useRealtimeSync((event) => {
    if (event.type === "chat") {
      window.dispatchEvent(new CustomEvent(CHAT_EVENT, { detail: event }));
      refreshUnread();
      return;
    }
    router.refresh();
    loadShell().then((next) => {
      memoryCache = { data: next, at: Date.now() };
      setData(next);
    });
  });

  // The Chat page clears unread messages as it opens them.
  useEffect(() => {
    const onRead = () => refreshUnread();
    window.addEventListener("chat:read", onRead);
    return () => window.removeEventListener("chat:read", onRead);
  }, [refreshUnread]);

  const { orders, ctx, admin, user } = data;
  const visibleOrders = ownOrdersOnly(orders, user, ctx);
  const name = user ? displayName(user) : admin ? "Admin" : "";
  const sections = buildNav(user, admin, unreadChats);

  const sidebar = (
    <div className="flex h-full flex-col">
      <Link href="/" className="flex items-center gap-2.5 px-5 pb-5 pt-6">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 shadow-sm shadow-brand-600/30">
          <Truck size={20} variant="Bold" color="#ffffff" />
        </span>
        <span className="leading-tight">
          <span className="block text-[15px] font-bold tracking-tight text-ink-900">China–Iran</span>
          <span className="block text-xs font-medium text-slate-400">Logistics tracker</span>
        </span>
      </Link>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-4">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
              {section.title}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(pathname, item);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      prefetch
                      className={`group flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${
                        active
                          ? "bg-brand-50 font-semibold text-brand-700"
                          : "font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      <span className={active ? "text-brand-600" : "text-slate-400 group-hover:text-slate-600"}>
                        {item.icon}
                      </span>
                      <span className="flex-1">{item.label}</span>
                      {item.badge ? (
                        <span className="min-w-[20px] rounded-full bg-brand-600 px-1.5 py-0.5 text-center text-[11px] font-bold leading-none text-white">
                          {item.badge > 99 ? "99+" : item.badge}
                        </span>
                      ) : null}
                    </Link>
                    {item.href === "/" && isMonitoringPage && (
                      <ActiveOrders
                        orders={visibleOrders}
                        ctx={ctx}
                        error={error}
                        canCreate={user?.role === "CONSIGNEE" || user?.role === "EMPLOYEE"}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {(user || admin) && (
        <Link
          href="/profile"
          className={`m-3 flex items-center gap-3 rounded-2xl border p-2.5 transition ${
            pathname.startsWith("/profile")
              ? "border-brand-200 bg-brand-50"
              : "border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50"
          }`}
        >
          <Avatar
            photoUrl={user?.photoUrl}
            firstName={user?.firstName}
            lastName={user?.lastName}
            email={user?.email ?? "admin"}
            size={36}
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-slate-900">{name || "…"}</span>
            <span className="block truncate text-xs text-slate-500">{user ? roleLabel(user.role) : "Admin"}</span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
        </Link>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 lg:pl-64">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200/80 bg-white lg:block">
        {sidebar}
      </aside>

      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-slate-900/30 backdrop-blur-[2px]"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-white shadow-2xl">
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setDrawerOpen(false)}
              className="absolute right-3 top-5 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-5 w-5" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="relative rounded-lg p-1.5 text-slate-600 hover:bg-slate-100"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
          {unreadChats > 0 && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-brand-600" />}
        </button>
        <Link href="/" className="flex items-center gap-2 font-bold text-ink-900">
          <Truck size={20} variant="Bold" color="#1d4e89" />
          China–Iran
        </Link>
        {(user || admin) && (
          <Link href="/profile" className="ml-auto">
            <Avatar
              photoUrl={user?.photoUrl}
              firstName={user?.firstName}
              lastName={user?.lastName}
              email={user?.email ?? "admin"}
              size={32}
            />
          </Link>
        )}
      </header>

      <main className="min-w-0 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
    </div>
  );
}

function ActiveOrders({
  orders,
  ctx,
  error,
  canCreate,
}: {
  orders: SidebarOrderDto[];
  ctx: ViewerContext;
  error: boolean;
  canCreate: boolean;
}) {
  return (
    <div className="mb-2 ml-[22px] mt-2 border-l border-slate-200 pl-3">
      {canCreate && (
        <Link
          href="/orders/new"
          className="mb-2 flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-brand-600 hover:bg-brand-50"
        >
          <Plus className="h-3.5 w-3.5" />
          New order
        </Link>
      )}
      <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">Active orders</p>
      {orders.length === 0 ? (
        <p className="px-2 py-1 text-xs text-slate-400">{error ? "Orders unavailable." : "No active orders."}</p>
      ) : (
        <ul className="max-h-[40vh] space-y-0.5 overflow-y-auto pr-1">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                href={getOrderHref(order, ctx)}
                prefetch
                title={order.name}
                className="block truncate rounded-lg px-2 py-1.5 text-[13px] text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                {order.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
