"use client";

import { useRouter } from "next/navigation";
import { formToJson } from "@/lib/api";
import { useApiSubmit } from "@/lib/hooks";
import type { GroupOrderDto } from "@logistics/shared";
import { OrderFields } from "@/components/OrderFields";

export function NewOrderForm() {
  const router = useRouter();
  const { submit, pending, error } = useApiSubmit();

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const result = await submit<{ order: GroupOrderDto }>("/api/consignee/orders", {
          body: formToJson(e.currentTarget),
          refresh: false,
        });
        if (result?.order) router.push(`/dashboard/orders/${result.order.id}`);
      }}
    >
      <OrderFields />
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <div className="mt-4">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Creating…" : "Create order"}
        </button>
      </div>
    </form>
  );
}
