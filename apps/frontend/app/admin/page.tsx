import Link from "next/link";
import { Box1, Profile2User } from "iconsax-react";
import { AdminShell } from "@/components/AdminShell";

export const dynamic = "force-dynamic";

export default function AdminHomePage() {
  return (
    <AdminShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Admin panel</h1>
          <p className="text-sm text-slate-500">Choose a section from the sidebar. Order details stay inside Orders.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Link href="/admin/users" className="card block hover:border-brand-300">
            <Profile2User size={28} variant="Bold" color="#1d4e89" />
            <h2 className="mt-3 text-lg font-semibold text-slate-900">Users</h2>
            <p className="mt-1 text-sm text-slate-500">Names, IDs, emails, phones, account type and age.</p>
          </Link>
          <Link href="/admin/orders" className="card block hover:border-brand-300">
            <Box1 size={28} variant="Bold" color="#1d4e89" />
            <h2 className="mt-3 text-lg font-semibold text-slate-900">Orders</h2>
            <p className="mt-1 text-sm text-slate-500">All orders with consignee and linked operators.</p>
          </Link>
        </div>
      </div>
    </AdminShell>
  );
}
