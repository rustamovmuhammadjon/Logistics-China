import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { logoutUserAction } from "@/lib/actions/user-auth";
import { ConsigneeHome } from "./ConsigneeHome";
import { OperatorHome } from "./OperatorHome";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <Link href="/" className="text-sm text-brand-600 hover:underline">
          ← Monitoring
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">
            {user.email} · <span className="badge-slate">{user.role.toLowerCase()}</span>
          </span>
          <form action={logoutUserAction}>
            <button type="submit" className="btn-secondary">
              Log out
            </button>
          </form>
        </div>
      </header>

      {user.role === "CONSIGNEE" ? <ConsigneeHome user={user} /> : <OperatorHome user={user} />}
    </main>
  );
}
