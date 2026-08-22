import Link from "next/link";
import { Activity, CheckCircle2, LayoutDashboard, Plus, Shield } from "lucide-react";
import { Truck } from "iconsax-react";
import { displayName, getOrderHref, type SidebarOrderDto, type ViewerContext, type UserPublic } from "@logistics/shared";
import { serverApiSafe } from "@/lib/server-api";
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

export async function AppShell({ children }: { children: React.ReactNode }) {
  const { data, error } = await serverApiSafe<ShellData>("/api/monitoring/sidebar");
  const { orders, ctx, admin, user } = data ?? emptyShell;
  const name = user ? displayName(user) : "Admin";

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex flex-wrap items-center gap-1">
            <Link href="/" className="mr-3 flex items-center gap-2 font-bold text-ink-900">
              <Truck size={22} variant="Bold" color="#1d4e89" />
              China–Iran Logistics
            </Link>
            <NavLink href="/" icon={<Activity className="h-4 w-4" />}>
              Monitoring
            </NavLink>
            <NavLink href="/completed" icon={<CheckCircle2 className="h-4 w-4" />}>
              Completed
            </NavLink>
            {user && (
              <NavLink href="/dashboard" icon={<LayoutDashboard className="h-4 w-4" />}>
                My dashboard
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
                <p className="text-sm font-medium leading-tight text-slate-900">{name}</p>
                <p className="text-xs leading-tight text-slate-500">{user ? user.role.toLowerCase() : "admin"}</p>
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

      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 lg:flex-row">
        <aside className="w-full shrink-0 lg:w-60">
          <div className="card lg:sticky lg:top-24">
            {user?.role === "CONSIGNEE" && (
              <Link href="/dashboard/orders/new" className="btn-primary mb-4 w-full">
                <Plus className="h-4 w-4" />
                New order
              </Link>
            )}
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Active orders</h2>
            {orders.length === 0 ? (
              <p className="text-sm text-slate-400">{error ? "Orders unavailable." : "No active orders."}</p>
            ) : (
              <ul className="max-h-[70vh] space-y-1 overflow-y-auto">
                {orders.map((order) => (
                  <li key={order.id}>
                    <Link
                      href={getOrderHref(order, ctx)}
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
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

function NavLink({ href, icon, children }: { href: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    >
      {icon}
      {children}
    </Link>
  );
}
