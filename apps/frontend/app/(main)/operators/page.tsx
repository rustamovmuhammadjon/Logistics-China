import { redirect } from "next/navigation";
import type { AuthMe, OperatorEmployeeDto } from "@logistics/shared";
import { serverApi, serverApiOrNull } from "@/lib/server-api";
import { OperatorsManager } from "./OperatorsManager";

export const dynamic = "force-dynamic";

export default async function OperatorsPage() {
  const me = await serverApi<AuthMe>("/api/auth/me");
  if (!me.user) redirect("/login");
  if (me.user.role !== "OPERATOR_COMPANY") redirect("/dashboard");

  const data = await serverApiOrNull<{ operators: OperatorEmployeeDto[] }>("/api/operator-company/operators");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Operators</h1>
        <p className="text-sm text-slate-500">
          Add operators who track orders and update truck locations on your company's behalf. Once added, an
          operator works exactly as before — linking with consignees/companies and updating locations.
        </p>
      </div>
      <OperatorsManager operators={data?.operators ?? []} />
    </div>
  );
}
