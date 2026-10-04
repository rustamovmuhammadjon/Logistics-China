import type { CompanyPartnerDto, UserPublic } from "@logistics/shared";
import { serverApiOrNull } from "@/lib/server-api";
import { PartnersManager } from "./PartnersManager";

export function canSeePartners(user: Pick<UserPublic, "role" | "companyId">) {
  return (
    user.role === "COMPANY" ||
    user.role === "OPERATOR_COMPANY" ||
    user.role === "EMPLOYEE" ||
    (user.role === "OPERATOR" && !!user.companyId)
  );
}

// Lives under Profile: which partner company this account's company is
// linked with is account-level information, not a daily workspace.
export async function PartnersSection({ user }: { user: UserPublic }) {
  const data = await serverApiOrNull<{ partners: CompanyPartnerDto[] }>("/api/partners");
  const role = user.role;
  const canManage = role === "COMPANY" || role === "OPERATOR_COMPANY";
  // A COMPANY (or its employees) partners with a tracking company, and
  // vice versa — never confuse this with the COMPANY/OPERATOR_COMPANY
  // split itself.
  const isOrdersSide = role === "COMPANY" || role === "EMPLOYEE";
  const counterpartLabel = isOrdersSide ? "tracking company" : "company";
  const memberLabel = isOrdersSide ? "Operators" : "Employees";

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Partner company</h2>
        <p className="text-sm text-slate-500">
          Link with your partner {counterpartLabel} by ID to see their account ID and their {memberLabel.toLowerCase()}
          {"'"} IDs — enough to link with them directly.
        </p>
      </div>
      <PartnersManager
        myCode={user.linkCode}
        counterpartLabel={counterpartLabel}
        memberLabel={memberLabel}
        partners={data?.partners ?? []}
        canManage={canManage}
      />
    </div>
  );
}
