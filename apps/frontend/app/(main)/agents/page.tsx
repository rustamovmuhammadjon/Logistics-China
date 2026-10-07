import { Contact } from "lucide-react";
import type { AgentDirectoryEntryDto, AuthMe } from "@logistics/shared";
import { serverApi, serverApiSafe } from "@/lib/server-api";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/SectionTabs";
import { AgentsDirectory } from "./AgentsDirectory";

export const dynamic = "force-dynamic";

export default async function AgentsPage() {
  const me = await serverApi<AuthMe>("/api/auth/me");
  const role = me.user?.role;
  const icon = <Contact className="h-5 w-5" />;

  if (role !== "OPERATOR" && role !== "OPERATOR_COMPANY") {
    return (
      <EmptyState
        icon={<Contact className="h-9 w-9" />}
        title="Agents is for operators"
        description="Operators and tracking companies keep their agents here and attach them to sub-orders."
      />
    );
  }

  const { data, error } = await serverApiSafe<{ agents: AgentDirectoryEntryDto[] }>("/api/agents");

  return (
    <div className="space-y-5">
      <PageHeader
        title="Agents"
        description={
          role === "OPERATOR_COMPANY" || me.user?.companyId
            ? "Your company's agents, shared by all its operators. Attach them to a sub-order once it has a vehicle."
            : "Your agents. Attach them to a sub-order once it has a vehicle."
        }
        icon={icon}
      />
      {data ? <AgentsDirectory agents={data.agents} /> : <p className="card text-sm text-red-600">{error}</p>}
    </div>
  );
}
