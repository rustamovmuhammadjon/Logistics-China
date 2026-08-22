"use client";

import { Link2, Unlink } from "lucide-react";
import { formatDate, type LinkedAccountDto } from "@logistics/shared";
import { useApiSubmit } from "@/lib/hooks";
import { ConfirmButton } from "@/components/ConfirmButton";

export function LinkPanel({
  myCode,
  counterpartLabel,
  links,
}: {
  myCode: string;
  counterpartLabel: string;
  links: LinkedAccountDto[];
}) {
  const { submit, submitForm, pending, error } = useApiSubmit();

  return (
    <div className="card space-y-4">
      <div className="flex items-start gap-2">
        <Link2 className="mt-0.5 h-5 w-5 text-brand-600" />
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Linked accounts</h2>
          <p className="text-sm text-slate-500">
            Your ID: <span className="font-mono font-semibold text-slate-900">{myCode}</span> — share this with
            your {counterpartLabel} so they can link to you.
          </p>
        </div>
      </div>

      <form onSubmit={(e) => submitForm(e, "/api/links")} className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="field-label">Link a {counterpartLabel} by ID</label>
          <input className="field-input font-mono" type="text" name="code" placeholder="8-digit ID" maxLength={8} required />
        </div>
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Linking…" : "Link"}
        </button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {links.length === 0 ? (
        <p className="text-sm text-slate-400">No linked {counterpartLabel}s yet.</p>
      ) : (
        <ul className="space-y-2">
          {links.map((link) => (
            <li
              key={link.linkId}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
            >
              <span>
                {link.email} <span className="text-xs text-slate-400">(linked {formatDate(link.createdAt)})</span>
              </span>
              <ConfirmButton
                confirmText={`Unlink ${link.email}?`}
                className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700"
                disabled={pending}
                onConfirm={() => submit(`/api/links/${link.linkId}`, { method: "DELETE" })}
              >
                <Unlink className="h-3.5 w-3.5" />
                Unlink
              </ConfirmButton>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
