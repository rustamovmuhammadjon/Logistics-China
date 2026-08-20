import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getViewerSession, isAdminAuthenticated } from "@/lib/auth";
import { logoutUserAction } from "@/lib/actions/user-auth";
import { getOrderHref, getViewerContext } from "@/lib/order-links";

export default async function MonitoringLayout({ children }: { children: React.ReactNode }) {
  const [viewer, admin, ctx] = await Promise.all([
    getViewerSession(),
    isAdminAuthenticated(),
    getViewerContext(),
  ]);

  const sidebarOrders = await prisma.groupOrder.findMany({
    where: { arrivedAt: null },
    select: { id: true, name: true, ownerId: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen">
      <nav className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/" className="font-bold text-slate-900">
              China–Iran Logistics
            </Link>
            <Link href="/" className="text-sm text-slate-600 hover:text-slate-900">
              Monitoring
            </Link>
            <Link href="/completed" className="text-sm text-slate-600 hover:text-slate-900">
              Completed
            </Link>
            {viewer && (
              <Link href="/dashboard" className="text-sm text-slate-600 hover:text-slate-900">
                My dashboard
              </Link>
            )}
          </div>
          <div className="flex items-center gap-3">
            {viewer && <span className="text-sm text-slate-500">{viewer.email}</span>}
            {admin && <span className="badge-slate">admin</span>}
            {admin && (
              <Link href="/admin" className="btn-secondary shrink-0">
                Admin panel
              </Link>
            )}
            {viewer && (
              <form action={logoutUserAction}>
                <button type="submit" className="btn-secondary">
                  Log out
                </button>
              </form>
            )}
          </div>
        </div>
      </nav>

      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 lg:flex-row">
        <aside className="w-full shrink-0 lg:w-56">
          <div className="card lg:sticky lg:top-6">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Orders
            </h2>
            {sidebarOrders.length === 0 ? (
              <p className="text-sm text-slate-400">No active orders.</p>
            ) : (
              <ul className="max-h-[70vh] space-y-1 overflow-y-auto">
                {sidebarOrders.map((order) => (
                  <li key={order.id}>
                    <Link
                      href={getOrderHref(order, ctx)}
                      className="block truncate rounded-md px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
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
