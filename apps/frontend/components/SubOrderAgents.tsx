"use client";

import Link from "next/link";
import { UserPlus, X } from "lucide-react";
import { agentLabel, type AgentDto, type SubOrderAgentDto } from "@logistics/shared";
import { formToJson } from "@/lib/api";
import { useApiSubmit } from "@/lib/hooks";
import { ConfirmButton } from "@/components/ConfirmButton";

export function SubOrderAgents({
  apiBase,
  attached,
  directory,
  canMutate,
  hasVehicle,
}: {
  apiBase: string;
  attached: SubOrderAgentDto[];
  directory: AgentDto[];
  canMutate: boolean;
  hasVehicle: boolean;
}) {
  const { submit, pending, error } = useApiSubmit();
  const attachedIds = new Set(attached.map((a) => a.agentId));
  const available = directory.filter((agent) => !attachedIds.has(agent.id));

  return (
    <div className="space-y-2 rounded-xl border border-slate-200 p-3">
      <h3 className="text-sm font-semibold text-slate-900">Agents</h3>

      {attached.length === 0 ? (
        <p className="text-xs text-slate-400">No agent attached.</p>
      ) : (
        <ul className="space-y-1.5">
          {attached.map(({ agent, attachedByLabel }) => (
            <li
              key={agent.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-1.5 text-xs"
              title={attachedByLabel ? `Attached by ${attachedByLabel}` : undefined}
            >
              <span className="min-w-0">
                <strong className="text-slate-800">{agentLabel(agent)}</strong>
                {agent.phone ? <span className="text-slate-500"> · {agent.phone}</span> : null}
                {agent.location ? <span className="text-slate-400"> · {agent.location}</span> : null}
              </span>
              {canMutate && (
                <ConfirmButton
                  confirmText={`Remove ${agent.name} from this sub-order?`}
                  className="inline-flex items-center gap-1 text-red-500 hover:text-red-700"
                  disabled={pending}
                  onConfirm={() => submit(`${apiBase}/agents/${agent.id}`, { method: "DELETE" })}
                >
                  <X className="h-3.5 w-3.5" />
                  Remove
                </ConfirmButton>
              )}
            </li>
          ))}
        </ul>
      )}

      {canMutate &&
        (!hasVehicle ? (
          <p className="text-xs text-slate-400">Assign a vehicle to this sub-order first, then you can attach an agent.</p>
        ) : directory.length === 0 ? (
          <p className="text-xs text-slate-500">
            Your agent list is empty —{" "}
            <Link href="/agents" className="text-brand-600 hover:underline">
              add agents in Agents
            </Link>{" "}
            first.
          </p>
        ) : available.length === 0 ? (
          <p className="text-xs text-slate-400">Every agent in your list is already attached.</p>
        ) : (
          <form
            className="flex flex-col gap-2 sm:flex-row"
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const ok = await submit(`${apiBase}/agents`, { body: formToJson(form) });
              if (ok) form.reset();
            }}
          >
            <select name="agentId" className="field-input flex-1" required defaultValue="">
              <option value="" disabled>
                Choose an agent…
              </option>
              {available.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agentLabel(agent)}
                  {agent.location ? ` — ${agent.location}` : ""}
                </option>
              ))}
            </select>
            <button type="submit" className="btn-secondary shrink-0" disabled={pending}>
              <UserPlus className="h-4 w-4" />
              Attach agent
            </button>
          </form>
        ))}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
