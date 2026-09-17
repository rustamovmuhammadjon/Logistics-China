import { redirect } from "next/navigation";
import type { AuthMe, EmployeeDto } from "@logistics/shared";
import { serverApi, serverApiOrNull } from "@/lib/server-api";
import { EmployeesManager } from "./EmployeesManager";

export const dynamic = "force-dynamic";

export default async function EmployeesPage() {
  const me = await serverApi<AuthMe>("/api/auth/me");
  if (!me.user) redirect("/login");
  if (me.user.role !== "COMPANY") redirect("/dashboard");

  const data = await serverApiOrNull<{ employees: EmployeeDto[] }>("/api/company/employees");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Employees</h1>
        <p className="text-sm text-slate-500">
          Add employees who create and manage orders on your company's behalf. Their orders stay with your company
          even after they're deactivated.
        </p>
      </div>
      <EmployeesManager employees={data?.employees ?? []} />
    </div>
  );
}
