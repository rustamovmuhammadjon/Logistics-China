"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  ChevronLeft,
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
import { SIDEBAR_COOKIE } from "@/lib/sidebar";
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

function isTyping(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

export function AppShell({ children, defaultCollapsed = false }: { children: React.ReactNode; defaultCollapsed?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [data, setData] = useState<ShellData>(memoryCache?.data ?? emptyShell);
  const [error, setError] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [tip, setTip] = useState<{ label: string; top: number } | null>(null);
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
  useEffect(() => {
    setDrawerOpen(false);
    setTip(null);
  }, [pathname]);

  const toggleSidebar = useCallback(() => {
    setTip(null);
    setCollapsed((value) => !value);
  }, []);

  useEffect(() => {
    document.cookie = `${SIDEBAR_COOKIE}=${collapsed ? "collapsed" : "expanded"}; path=/; max-age=31536000; samesite=lax`;
  }, [collapsed]);

  // Ctrl+B (⌘B on a Mac), as in most editors and dashboards — but not while
  // typing, where the keys belong to the field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey || e.key.toLowerCase() !== "b") return;
      if (isTyping(e.target)) return;
      e.preventDefault();
      toggleSidebar();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleSidebar]);

  // The collapsed rail names its icons in a floating tip. It is fixed to the
  // viewport so the rail's overflow clipping can't cut it off.
  function showTip(el: HTMLElement, label: string) {
    const rect = el.getBoundingClientRect();
    setTip({ label, top: rect.top + rect.height / 2 });
  }

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

  // `compact` is the collapsed desktop rail (72px). The logo mark, icons and
  // avatar sit at the same x in both widths, so collapsing only slides the
  // labels out of view instead of reflowing the column.
  function renderSidebar(compact: boolean) {
    const fade = `transition-opacity duration-200 ${compact ? "opacity-0" : ""}`;
    const tipProps = (label: string) =>
      compact
        ? {
            onMouseEnter: (e: React.MouseEvent<HTMLElement>) => showTip(e.currentTarget, label),
            onFocus: (e: React.FocusEvent<HTMLElement>) => showTip(e.currentTarget, label),
            onMouseLeave: () => setTip(null),
            onBlur: () => setTip(null),
          }
        : {};

    return (
      <div className="flex h-full flex-col">
        <Link href="/" className="flex items-center gap-2.5 pb-5 pl-[18px] pr-5 pt-6">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 shadow-sm shadow-brand-600/30">
            <Truck size={20} variant="Bold" color="#ffffff" />
          </span>
          <span className={`min-w-0 overflow-hidden whitespace-nowrap leading-tight ${fade}`}>
            <span className="block text-[15px] font-bold tracking-tight text-ink-900">China–Iran</span>
            <span className="block text-xs font-medium text-slate-400">Logistics tracker</span>
          </span>
        </Link>

        <nav className="flex-1 space-y-6 overflow-y-auto overflow-x-hidden px-3 pb-4">
          {sections.map((section, index) => (
            <div key={section.title}>
              <div className="relative mb-1.5 h-4 px-3">
                <p
                  className={`overflow-hidden whitespace-nowrap text-[11px] font-semibold uppercase leading-4 tracking-[0.08em] text-slate-400 ${fade}`}
                >
                  {section.title}
                </p>
                {compact && index > 0 && (
                  <span className="absolute left-1/2 top-1/2 h-px w-6 -translate-x-1/2 bg-slate-200" />
                )}
              </div>
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const active = isActive(pathname, item);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        prefetch
                        {...tipProps(item.badge ? `${item.label} · ${item.badge} unread` : item.label)}
                        className={`group flex items-center gap-3 rounded-xl px-[15px] py-2 text-sm transition ${
                          active
                            ? "bg-brand-50 font-semibold text-brand-700"
                            : "font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        }`}
                      >
                        <span
                          className={`relative flex shrink-0 ${active ? "text-brand-600" : "text-slate-400 group-hover:text-slate-600"}`}
                        >
                          {item.icon}
                          {compact && item.badge ? (
                            <span className="absolute -right-2 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
                              {item.badge > 9 ? "9+" : item.badge}
                            </span>
                          ) : null}
                        </span>
                        <span className={`min-w-0 flex-1 overflow-hidden whitespace-nowrap ${fade}`}>{item.label}</span>
                        {!compact && item.badge ? (
                          <span className="min-w-[20px] rounded-full bg-brand-600 px-1.5 py-0.5 text-center text-[11px] font-bold leading-none text-white">
                            {item.badge > 99 ? "99+" : item.badge}
                          </span>
                        ) : null}
                      </Link>
                      {item.href === "/" && isMonitoringPage && !compact && (
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
            {...tipProps(name || "Profile")}
            className={`m-3 flex items-center gap-3 overflow-hidden rounded-2xl border p-[5px] pr-3 transition ${
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
            <span className={`min-w-0 flex-1 ${fade}`}>
              <span className="block truncate text-sm font-semibold text-slate-900">{name || "…"}</span>
              <span className="block truncate text-xs text-slate-500">{user ? roleLabel(user.role) : "Admin"}</span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
          </Link>
        )}
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen bg-slate-50 transition-[padding] duration-200 ease-out motion-reduce:transition-none ${
        collapsed ? "lg:pl-[72px]" : "lg:pl-64"
      }`}
    >
      <aside
        id="app-sidebar"
        className={`fixed inset-y-0 left-0 z-30 hidden overflow-hidden border-r border-slate-200/80 bg-white transition-[width] duration-200 ease-out motion-reduce:transition-none lg:block ${
          collapsed ? "w-[72px]" : "w-64"
        }`}
      >
        {renderSidebar(collapsed)}
      </aside>

      {/* Sits on the sidebar's edge, outside the aside so its clipping can't cut it. */}
      <button
        type="button"
        onClick={toggleSidebar}
        aria-controls="app-sidebar"
        aria-expanded={!collapsed}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        title={`${collapsed ? "Expand" : "Collapse"} sidebar · Ctrl+B`}
        className={`fixed top-[30px] z-40 hidden h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-[left,color,border-color] duration-200 ease-out hover:border-brand-200 hover:text-brand-600 motion-reduce:transition-none lg:flex ${
          collapsed ? "left-[60px]" : "left-[244px]"
        }`}
      >
        {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
      </button>

      {collapsed && tip && (
        <span
          role="tooltip"
          style={{ top: tip.top }}
          className="pointer-events-none fixed left-[80px] z-50 hidden -translate-y-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg before:absolute before:-left-1 before:top-1/2 before:h-2 before:w-2 before:-translate-y-1/2 before:rotate-45 before:bg-slate-900 before:content-[''] lg:block"
        >
          {tip.label}
        </span>
      )}

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
            {renderSidebar(false)}
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
    <div className="mb-2 ml-6 mt-2 border-l border-slate-200 pl-3">
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
