export function PaymentBadge({ status, label }: { status: "PAID" | "NOT_PAID"; label: string }) {
  return (
    <span className={status === "PAID" ? "badge-green" : "badge-amber"}>
      {label}: {status === "PAID" ? "Paid" : "Not paid"}
    </span>
  );
}
