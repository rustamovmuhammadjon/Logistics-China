"use client";

import { useState } from "react";
import { Link2, Settings, Unlink } from "lucide-react";
import { formatDate, type LinkedAccountDto } from "@logistics/shared";
import { useApiSubmit } from "@/lib/hooks";
import { ConfirmButton } from "@/components/ConfirmButton";

type OrderOption = { id: string; name: string };

export function LinkPanel({
  myCode,
  counterpartLabel,
  links,
  isConsignee,
  activeOrders = [],
}: {
  myCode: string;
  counterpartLabel: string;
  links: LinkedAccountDto[];
  isConsignee: boolean;
  activeOrders?: OrderOption[];
}) {
  const { submit, pending, error } = useApiSubmit();
  const [newScope, setNewScope] = useState<"ALL" | "SELECTED">("ALL");
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);

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

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const code = new FormData(e.currentTarget).get("code");
          const body: Record<string, unknown> = { code };
          if (isConsignee) {
            body.scope = newScope;
            if (newScope === "SELECTED") body.orderIds = [...newOrderIds];
          }
          const result = await submit("/api/links", { body });
          if (result) {
            e.currentTarget.reset();
            setNewScope("ALL");
            setNewOrderIds(new Set());
          }
        }}
        className="space-y-3"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="field-label">Link a {counterpartLabel} by ID</label>
            <input className="field-input font-mono" type="text" name="code" placeholder="8-digit ID" maxLength={8} required />
          </div>
          <button type="submit" className="btn-primary" disabled={pending}>
            {pending ? "Linking…" : "Link"}
          </button>
        </div>

        {isConsignee && activeOrders.length > 0 && (
          <div className="rounded-xl border border-slate-200 p-3">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={newScope === "SELECTED"}
                onChange={(e) => setNewScope(e.target.checked ? "SELECTED" : "ALL")}
              />
              Only give access to specific orders (default: all orders)
            </label>
            {newScope === "SELECTED" && (
              <OrderChecklist orders={activeOrders} selected={newOrderIds} onChange={setNewOrderIds} />
            )}
          </div>
        )}
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {links.length === 0 ? (
        <p className="text-sm text-slate-400">No linked {counterpartLabel}s yet.</p>
      ) : (
        <ul className="space-y-2">
          {links.map((link) => (
            <li key={link.linkId} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  {link.email} <span className="text-xs text-slate-400">(linked {formatDate(link.createdAt)})</span>
                  {isConsignee && (
                    <span className="badge-slate ml-2 text-[10px]">
                      {link.scope === "SELECTED" ? `${link.grantedOrderIds?.length ?? 0} order(s)` : "All orders"}
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-3">
                  {isConsignee && (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline"
                      onClick={() => setEditingLinkId((id) => (id === link.linkId ? null : link.linkId))}
                    >
                      <Settings className="h-3.5 w-3.5" />
                      Manage access
                    </button>
                  )}
                  <ConfirmButton
                    confirmText={`Unlink ${link.email}?`}
                    className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700"
                    disabled={pending}
                    onConfirm={() => submit(`/api/links/${link.linkId}`, { method: "DELETE" })}
                  >
                    <Unlink className="h-3.5 w-3.5" />
                    Unlink
                  </ConfirmButton>
                </div>
              </div>
              {isConsignee && editingLinkId === link.linkId && (
                <ManageAccessForm
                  link={link}
                  activeOrders={activeOrders}
                  onDone={() => setEditingLinkId(null)}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function OrderChecklist({
  orders,
  selected,
  onChange,
}: {
  orders: OrderOption[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  }

  return (
    <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto pl-6 text-sm">
      {orders.map((order) => (
        <li key={order.id}>
          <label className="flex items-center gap-2 text-slate-600">
            <input type="checkbox" checked={selected.has(order.id)} onChange={() => toggle(order.id)} />
            {order.name}
          </label>
        </li>
      ))}
    </ul>
  );
}

function ManageAccessForm({
  link,
  activeOrders,
  onDone,
}: {
  link: LinkedAccountDto;
  activeOrders: OrderOption[];
  onDone: () => void;
}) {
  const { submit, pending, error } = useApiSubmit();
  const [scope, setScope] = useState<"ALL" | "SELECTED">(link.scope ?? "ALL");
  const [orderIds, setOrderIds] = useState<Set<string>>(new Set(link.grantedOrderIds ?? []));

  return (
    <div className="mt-3 space-y-2 border-t border-slate-200 pt-3">
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="radio" name={`scope-${link.linkId}`} checked={scope === "ALL"} onChange={() => setScope("ALL")} />
        All orders
      </label>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="radio"
          name={`scope-${link.linkId}`}
          checked={scope === "SELECTED"}
          onChange={() => setScope("SELECTED")}
        />
        Only specific orders
      </label>
      {scope === "SELECTED" &&
        (activeOrders.length === 0 ? (
          <p className="pl-6 text-sm text-slate-400">No active orders yet.</p>
        ) : (
          <OrderChecklist orders={activeOrders} selected={orderIds} onChange={setOrderIds} />
        ))}
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          className="btn-primary text-xs"
          disabled={pending}
          onClick={async () => {
            const result = await submit(`/api/links/${link.linkId}`, {
              method: "PATCH",
              body: {
                scope,
                orderIds: [...orderIds],
                visibleOrderIds: activeOrders.map((o) => o.id),
              },
            });
            if (result) onDone();
          }}
        >
          Save
        </button>
        <button type="button" className="btn-secondary text-xs" onClick={onDone}>
          Cancel
        </button>
      </div>
    </div>
  );
}
