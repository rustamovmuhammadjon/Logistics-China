import { redirect } from "next/navigation";
import type { AuthMe, CompanyPartnerDto } from "@logistics/shared";
import { serverApi, serverApiOrNull } from "@/lib/server-api";
import { PartnersManager } from "./PartnersManager";

export const dynamic = "force-dynamic";

export default async function PartnersPage() {
  const me = await serverApi<AuthMe>("/api/auth/me");
  if (!me.user) redirect("/login");

  const role = me.user.role;
  const allowed =
    role === "COMPANY" ||
    role === "OPERATOR_COMPANY" ||
    role === "EMPLOYEE" ||
    (role === "OPERATOR" && !!me.user.companyId);
  if (!allowed) redirect("/dashboard");

  const data = await serverApiOrNull<{ partners: CompanyPartnerDto[] }>("/api/partners");
  const canManage = role === "COMPANY" || role === "OPERATOR_COMPANY";
  // A COMPANY (or its employees) partners with a tracking company, and
  // vice versa — never confuse this with the COMPANY/OPERATOR_COMPANY
  // split itself.
  const isOrdersSide = role === "COMPANY" || role === "EMPLOYEE";
  const counterpartLabel = isOrdersSide ? "tracking company" : "company";
  const memberLabel = isOrdersSide ? "Operators" : "Employees";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Partner Company</h1>
        <p className="text-sm text-slate-500">
          Link with your partner {counterpartLabel} by ID to see their account ID and their {memberLabel.toLowerCase()}
          {"'"} IDs — enough to link with them directly.
        </p>
      </div>
      <PartnersManager
        myCode={me.user.linkCode}
        counterpartLabel={counterpartLabel}
        memberLabel={memberLabel}
        partners={data?.partners ?? []}
        canManage={canManage}
      />
    </div>
  );
}
