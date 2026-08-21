import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { createOwnedGroupOrderAction } from "@/lib/actions/consignee";
import AppShell from "@/app/AppShell";

export const dynamic = "force-dynamic";

export default async function NewOrderPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "CONSIGNEE") redirect("/dashboard");

  return (
    <AppShell>
      <Link href="/dashboard" className="text-sm text-brand-600 hover:underline">
        ← My orders
      </Link>

      <div className="card mt-3 space-y-4">
        <h1 className="text-xl font-bold text-slate-900">New order</h1>
        <form action={createOwnedGroupOrderAction} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label">Name (required)</label>
            <input className="field-input" type="text" name="name" required />
          </div>
          <div>
            <label className="field-label">Opened date</label>
            <input className="field-input" type="date" name="openedAt" />
          </div>
          <div>
            <label className="field-label">Origin (from)</label>
            <input className="field-input" type="text" name="origin" />
          </div>
          <div>
            <label className="field-label">Destination (to)</label>
            <input className="field-input" type="text" name="destination" />
          </div>
          <div>
            <label className="field-label">Arrived date</label>
            <input className="field-input" type="date" name="arrivedAt" />
          </div>
          <div>
            <label className="field-label">POL (place of loading)</label>
            <input className="field-input" type="text" name="pol" />
          </div>
          <div>
            <label className="field-label">Commodity</label>
            <input className="field-input" type="text" name="commodity" />
          </div>
          <div>
            <label className="field-label">Volume</label>
            <input className="field-input" type="text" name="volumeInfo" placeholder="e.g. 8xFTL" />
          </div>
          <div>
            <label className="field-label">Factory load date</label>
            <input className="field-input" type="date" name="factoryLoadDate" />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" className="btn-primary">
              Create order
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
