type TruckForStats = {
  driverPaymentStatus: "NOT_PAID" | "PAID";
  customerPaymentStatus: "NOT_PAID" | "PAID";
};

export function truckStats(trucks: TruckForStats[]) {
  const total = trucks.length;
  const driverPaid = trucks.filter((t) => t.driverPaymentStatus === "PAID").length;
  const customerPaid = trucks.filter((t) => t.customerPaymentStatus === "PAID").length;
  return { total, driverPaid, customerPaid };
}

export function formatDirection(
  origin: string | null | undefined,
  destination: string | null | undefined
): string | null {
  if (!origin && !destination) return null;
  return `${origin || "?"} → ${destination || "?"}`;
}

export function formatDate(date: Date | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(date: Date | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
