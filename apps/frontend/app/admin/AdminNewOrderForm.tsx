"use client";

import { useRouter } from "next/navigation";
import { formToJson } from "@/lib/api";
import { useApiSubmit } from "@/lib/hooks";
import type { GroupOrderDto } from "@logistics/shared";
import { OrderFields } from "@/components/OrderFields";

export function AdminNewOrderForm() {
  const router = useRouter();
  const { submit, pending, error } = useApiSubmit();

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const result = await submit<{ order: GroupOrderDto }>("/api/admin/orders", {
          body: formToJson(e.currentTarget),
          refresh: false,
        });
        if (result?.order) router.push(`/admin/orders/${result.order.id}`);
      }}
    >
      <OrderFields />
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <button type="submit" className="btn-primary mt-4" disabled={pending}>
        {pending ? "Creating…" : "Create order"}
      </button>
    </form>
  );
}
