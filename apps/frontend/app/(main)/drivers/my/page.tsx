import type { GuestDriverSuggestionDto, MyDriverDto } from "@logistics/shared";
import { serverApiSafe } from "@/lib/server-api";
import { MyDrivers } from "./MyDrivers";

export const dynamic = "force-dynamic";

export default async function MyDriversPage() {
  const { data, error } = await serverApiSafe<{ drivers: MyDriverDto[]; suggestions: GuestDriverSuggestionDto[] }>(
    "/api/fleet/my"
  );
  if (!data) return <p className="card text-sm text-red-600">{error}</p>;
  return <MyDrivers drivers={data.drivers} suggestions={data.suggestions} />;
}
