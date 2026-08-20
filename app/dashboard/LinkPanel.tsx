"use client";

import { useActionState } from "react";
import { linkByCodeAction, unlinkAction } from "@/lib/actions/links";
import { formatDate } from "@/lib/stats";
import { ConfirmSubmitButton } from "@/app/components/ConfirmSubmitButton";

export function LinkPanel({
  myCode,
  counterpartLabel,
  links,
}: {
  myCode: string;
  counterpartLabel: string;
  links: { linkId: string; email: string; createdAt: Date }[];
}) {
  const [state, formAction, pending] = useActionState(linkByCodeAction, undefined);

  return (
    <div className="card space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Linked accounts</h2>
        <p className="text-sm text-slate-500">
          Your ID: <span className="font-mono font-semibold text-slate-900">{myCode}</span> — share
          this with your {counterpartLabel} so they can link to you.
        </p>
      </div>

      <form action={formAction} className="flex flex-col gap-2 sm:flex-row sm:items-end">
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
          {pending ? "Linking..." : "Link"}
        </button>
      </form>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      {links.length === 0 ? (
        <p className="text-sm text-slate-400">No linked {counterpartLabel}s yet.</p>
      ) : (
        <ul className="space-y-2">
          {links.map((link) => {
            const del = unlinkAction.bind(null, link.linkId);
            return (
              <li
                key={link.linkId}
                className="flex items-center justify-between rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-sm"
              >
                <span>
                  {link.email} <span className="text-xs text-slate-400">(linked {formatDate(link.createdAt)})</span>
                </span>
                <form action={del}>
                  <ConfirmSubmitButton
                    confirmText={`Unlink ${link.email}?`}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Unlink
                  </ConfirmSubmitButton>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
