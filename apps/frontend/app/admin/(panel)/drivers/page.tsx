import { Truck } from "iconsax-react";
import type { AdminDriverDto } from "@logistics/shared";
import { serverApi } from "@/lib/server-api";
import { DriversDirectory } from "./DriversDirectory";

export const dynamic = "force-dynamic";

export default async function AdminDriversPage() {
  const data = await serverApi<{ drivers: AdminDriverDto[] }>("/api/admin/drivers");
  const onTrip = data.drivers.filter((driver) => driver.activeTrip).length;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <Truck size={28} variant="Bold" color="#1d4e89" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Drivers</h1>
          <p className="text-sm text-slate-500">
            {data.drivers.length} registered · {onTrip} on a trip now. Drivers also register themselves in the app
            after signing in with an operator&apos;s code.
          </p>
        </div>
      </div>
      <DriversDirectory drivers={data.drivers} />
    </div>
  );
}
