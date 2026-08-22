import Link from "next/link";
import { Activity, CheckCircle2, Shield } from "lucide-react";
import { Truck } from "iconsax-react";
import type { AuthMe } from "@logistics/shared";
import { serverApiSafe } from "@/lib/server-api";
import { AdminSidebar } from "./AdminSidebar";

export async function AdminShell({ children }: { children: React.ReactNode }) {
  await serverApiSafe<AuthMe>("/api/auth/me");

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex flex-wrap items-center gap-1">
            <Link href="/" className="mr-3 flex items-center gap-2 font-bold text-ink-900">
              <Truck size={22} variant="Bold" color="#1d4e89" />
              China–Iran Logistics
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              <Activity className="h-4 w-4" />
              Monitoring
            </Link>
            <Link
              href="/completed"
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              <CheckCircle2 className="h-4 w-4" />
              Completed
            </Link>
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              <Shield className="h-4 w-4" />
              Admin panel
            </Link>
          </div>
          <Link href="/profile" className="text-sm font-medium text-slate-700 hover:text-slate-900">
            Admin
          </Link>
        </div>
      </nav>

      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 lg:flex-row">
        <AdminSidebar />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
