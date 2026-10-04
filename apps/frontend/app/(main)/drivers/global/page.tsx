import type { GlobalDriverDto } from "@logistics/shared";
import { serverApiSafe } from "@/lib/server-api";
import { GlobalDrivers } from "./GlobalDrivers";

export const dynamic = "force-dynamic";

export default async function GlobalDriversPage() {
  const { data, error } = await serverApiSafe<{ drivers: GlobalDriverDto[] }>("/api/fleet/global");
  if (!data) return <p className="card text-sm text-red-600">{error}</p>;
  return <GlobalDrivers drivers={data.drivers} />;
}
