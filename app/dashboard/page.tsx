import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import AppShell from "@/app/AppShell";
import { ConsigneeHome } from "./ConsigneeHome";
import { OperatorHome } from "./OperatorHome";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <AppShell>
      {user.role === "CONSIGNEE" ? <ConsigneeHome user={user} /> : <OperatorHome user={user} />}
    </AppShell>
  );
}
