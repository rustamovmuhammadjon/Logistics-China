"use client";

import { useMemo, useState } from "react";
import { Building2, Contact, Mail, MapPin, Pencil, Phone, Plus, Search, Trash2 } from "lucide-react";
import { formatDate, type AgentDirectoryEntryDto } from "@logistics/shared";
import { formToJson } from "@/lib/api";
import { useApiSubmit } from "@/lib/hooks";
import { ConfirmButton } from "@/components/ConfirmButton";
import { EmptyState } from "@/components/EmptyState";
import { PhoneField } from "@/components/PhoneField";
import { SlideOver } from "@/components/SlideOver";

type Panel = { mode: "create" } | { mode: "edit"; agent: AgentDirectoryEntryDto } | null;

export function AgentsDirectory({ agents }: { agents: AgentDirectoryEntryDto[] }) {
  const { submit, pending, error, setError } = useApiSubmit();
  const [panel, setPanel] = useState<Panel>(null);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return agents;
    return agents.filter((a) =>
      [a.name, a.company, a.phone, a.email, a.location].filter(Boolean).join(" ").toLowerCase().includes(q)
    );
  }, [agents, query]);

  function open(next: Panel) {
    setError(null);
    setPanel(next);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-baseline gap-1.5 rounded-xl border border-slate-200/80 bg-white px-3 py-1.5 text-sm">
          <span className="font-semibold tabular-nums text-slate-900">{agents.length}</span>
          <span className="text-slate-500">Agents</span>
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="field-input w-64 pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search agents"
            />
          </div>
          <button type="button" className="btn-primary" onClick={() => open({ mode: "create" })}>
            <Plus className="h-4 w-4" />
            Add agent
          </button>
        </div>
      </div>

      {!panel && error && <p className="text-sm text-red-600">{error}</p>}

      {agents.length === 0 ? (
        <EmptyState
          icon={<Contact className="h-9 w-9" />}
          title="No agents yet"
          description="Add the agents you work with. Then, on any sub-order that has a vehicle, pick one from the list to attach it."
        />
      ) : filtered.length === 0 ? (
        <p className="card text-center text-sm text-slate-500">No agent matches that search.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filtered.map((agent) => (
            <li key={agent.id} className="card flex min-w-0 flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900">{agent.name}</p>
                  {agent.company && (
                    <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-600">
                      <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span className="truncate">{agent.company}</span>
                    </p>
                  )}
                </div>
                {agent.attachedCount > 0 && (
                  <span className="badge-green shrink-0">
                    On {agent.attachedCount} open sub-order{agent.attachedCount === 1 ? "" : "s"}
                  </span>
                )}
              </div>

              <div className="space-y-1 text-sm text-slate-600">
                {agent.phone && (
                  <a href={`tel:${agent.phone}`} className="flex items-center gap-1.5 hover:text-brand-600">
                    <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    {agent.phone}
                  </a>
                )}
                {agent.email && (
                  <a href={`mailto:${agent.email}`} className="flex items-center gap-1.5 hover:text-brand-600">
                    <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span className="truncate">{agent.email}</span>
                  </a>
                )}
                {agent.location && (
                  <p className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span className="truncate">{agent.location}</span>
                  </p>
                )}
                {agent.note && <p className="whitespace-pre-wrap text-xs text-slate-500">{agent.note}</p>}
              </div>

              <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                <p className="mr-auto text-xs text-slate-400">
                  Added {formatDate(agent.createdAt)}
                  {agent.createdByLabel ? ` by ${agent.createdByLabel}` : ""}
                </p>
                <button type="button" className="btn-secondary px-3 py-1.5" onClick={() => open({ mode: "edit", agent })}>
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </button>
                <ConfirmButton
                  confirmText={`Remove ${agent.name} from your agents? Sub-orders it's already attached to keep showing it; it just can't be picked any more.`}
                  className="btn-danger px-3 py-1.5"
                  disabled={pending}
                  onConfirm={() => submit(`/api/agents/${agent.id}`, { method: "DELETE" })}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </ConfirmButton>
              </div>
            </li>
          ))}
        </ul>
      )}

      <SlideOver
        open={panel !== null}
        title={panel?.mode === "edit" ? `Edit ${panel.agent.name}` : "Add an agent"}
        description="Only the name is required. Changes show everywhere this agent is attached."
        onClose={() => setPanel(null)}
      >
        {panel && (
          <form
            key={panel.mode === "edit" ? panel.agent.id : "create"}
            className="space-y-6"
            onSubmit={async (e) => {
              e.preventDefault();
              const body = formToJson(e.currentTarget);
              const ok =
                panel.mode === "edit"
                  ? await submit(`/api/agents/${panel.agent.id}`, { method: "PATCH", body })
                  : await submit("/api/agents", { body });
              if (ok) setPanel(null);
            }}
          >
            <AgentFormFields agent={panel.mode === "edit" ? panel.agent : undefined} />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2 border-t border-slate-100 pt-4">
              <button type="submit" className="btn-primary" disabled={pending}>
                {pending ? "Saving…" : panel.mode === "edit" ? "Save changes" : "Add agent"}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setPanel(null)}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </SlideOver>
    </div>
  );
}

function AgentFormFields({ agent }: { agent?: AgentDirectoryEntryDto }) {
  return (
    <div className="space-y-3">
      <div>
        <label className="field-label">Name (required)</label>
        <input className="field-input" name="name" defaultValue={agent?.name ?? ""} required maxLength={120} />
      </div>
      <div>
        <label className="field-label">Company</label>
        <input className="field-input" name="company" defaultValue={agent?.company ?? ""} maxLength={120} />
      </div>
      <PhoneField name="phone" label="Phone" defaultValue={agent?.phone} />
      <div>
        <label className="field-label">Email</label>
        <input className="field-input" type="email" name="email" defaultValue={agent?.email ?? ""} maxLength={120} />
      </div>
      <div>
        <label className="field-label">Location / border point</label>
        <input
          className="field-input"
          name="location"
          defaultValue={agent?.location ?? ""}
          placeholder="e.g. Khorgos, Alat, Sarakhs"
          maxLength={120}
        />
      </div>
      <div>
        <label className="field-label">Note</label>
        <textarea className="field-input" name="note" rows={3} defaultValue={agent?.note ?? ""} maxLength={500} />
      </div>
    </div>
  );
}
