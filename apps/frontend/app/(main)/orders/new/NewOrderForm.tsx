"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formToJson } from "@/lib/api";
import { useApiSubmit } from "@/lib/hooks";
import type { GroupOrderDto, LinkedAccountDto } from "@logistics/shared";
import { OrderFields } from "@/components/OrderFields";

export function NewOrderForm({ operators }: { operators: LinkedAccountDto[] }) {
  const router = useRouter();
  const { submit, pending, error } = useApiSubmit();
  // Selected by default so a new order stays visible to everyone unless the
  // consignee actively narrows it down.
  const [selectedLinkIds, setSelectedLinkIds] = useState<Set<string>>(
    new Set(operators.filter((op) => op.scope === "SELECTED").map((op) => op.linkId))
  );

  function toggle(linkId: string) {
    setSelectedLinkIds((prev) => {
      const next = new Set(prev);
      if (next.has(linkId)) next.delete(linkId);
      else next.add(linkId);
      return next;
    });
  }

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const body = { ...formToJson(e.currentTarget), linkIds: [...selectedLinkIds] };
        const result = await submit<{ order: GroupOrderDto }>("/api/consignee/orders", {
          body,
          refresh: false,
        });
        if (result?.order) router.push(`/orders/${result.order.id}`);
      }}
    >
      <OrderFields />

      {operators.length >= 2 && (
        <div className="mt-4">
          <label className="field-label">Visible to which operators?</label>
          <ul className="mt-1 space-y-1.5">
            {operators.map((op) =>
              op.scope === "SELECTED" ? (
                <li key={op.linkId}>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" checked={selectedLinkIds.has(op.linkId)} onChange={() => toggle(op.linkId)} />
                    {op.email}
                  </label>
                </li>
              ) : (
                <li key={op.linkId}>
                  <label className="flex items-center gap-2 text-sm text-slate-400">
                    <input type="checkbox" checked readOnly disabled />
                    {op.email} <span className="text-xs">(sees all orders)</span>
                  </label>
                </li>
              )
            )}
          </ul>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <div className="mt-4">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Creating…" : "Create order"}
        </button>
      </div>
    </form>
  );
}
