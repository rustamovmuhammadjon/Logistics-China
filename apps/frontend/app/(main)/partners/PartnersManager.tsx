"use client";

import { Link2, Unlink } from "lucide-react";
import { formatDate, type CompanyPartnerDto } from "@logistics/shared";
import { useApiSubmit } from "@/lib/hooks";
import { ConfirmButton } from "@/components/ConfirmButton";

export function PartnersManager({
  myCode,
  counterpartLabel,
  memberLabel,
  partners,
  canManage,
}: {
  myCode: string;
  counterpartLabel: string;
  memberLabel: string;
  partners: CompanyPartnerDto[];
  canManage: boolean;
}) {
  const { submit, pending, error } = useApiSubmit();

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="card space-y-3">
          <div className="flex items-start gap-2">
            <Link2 className="mt-0.5 h-5 w-5 text-brand-600" />
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Link a partner</h2>
              <p className="text-sm text-slate-500">
                Your ID: <span className="font-mono font-semibold text-slate-900">{myCode}</span> — share this with
                your partner {counterpartLabel} so they can link to you.
              </p>
            </div>
          </div>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const code = new FormData(form).get("code");
              const result = await submit("/api/partners", { body: { code } });
              if (result) form.reset();
            }}
            className="flex flex-col gap-2 sm:flex-row sm:items-end"
          >
            <div className="flex-1">
              <label className="field-label">Link a {counterpartLabel} by ID</label>
              <input
                className="field-input font-mono"
                type="text"
                name="code"
                placeholder="8-digit ID"
                maxLength={8}
                required
              />
            </div>
            <button type="submit" className="btn-primary" disabled={pending}>
              {pending ? "Linking…" : "Link"}
            </button>
          </form>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      )}

      {partners.length === 0 ? (
        <p className="card text-center text-slate-400">No partner {counterpartLabel} linked yet.</p>
      ) : (
        <ul className="space-y-3">
          {partners.map((p) => (
            <li key={p.linkId} className="card space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-slate-900">{p.partner.companyName || p.partner.email}</p>
                  <p className="text-xs text-slate-400">
                    ID: <span className="font-mono">{p.partner.linkCode}</span> · {p.partner.email} · linked{" "}
                    {formatDate(p.createdAt)}
                  </p>
                </div>
                {canManage && (
                  <ConfirmButton
                    className="btn-danger text-xs"
                    confirmText={`Unlink ${p.partner.companyName || p.partner.email}?`}
                    disabled={pending}
                    onConfirm={() => submit(`/api/partners/${p.linkId}`, { method: "DELETE" })}
                  >
                    <Unlink className="h-3.5 w-3.5" />
                    Unlink
                  </ConfirmButton>
                )}
              </div>

              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{memberLabel}</h3>
                {p.members.length === 0 ? (
                  <p className="text-sm text-slate-400">No {memberLabel.toLowerCase()} yet.</p>
                ) : (
                  <ul className="space-y-1">
                    {p.members.map((m) => (
                      <li
                        key={m.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                      >
                        <span>
                          {[m.firstName, m.lastName].filter(Boolean).join(" ") || m.email}
                          {!m.active && <span className="badge-red ml-2 text-[10px]">Deactivated</span>}
                        </span>
                        <span className="font-mono text-xs text-slate-500">{m.linkCode}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
