import Link from "next/link";
import { logoutAction } from "@/lib/actions/auth";

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <nav className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="font-bold text-slate-900">
              Admin
            </Link>
            <Link href="/" className="text-sm text-slate-500 hover:text-slate-800">
              Public monitoring page
            </Link>
          </div>
          <form action={logoutAction}>
            <button type="submit" className="btn-secondary">
              Log out
            </button>
          </form>
        </div>
      </nav>
      <div className="mx-auto max-w-5xl px-4 py-8">{children}</div>
    </div>
  );
}
