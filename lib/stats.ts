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

/**
 * How stale a location update is: green within 2 days, amber up to 5 days,
 * red beyond that. "none" when it's never been updated.
 */
export type Freshness = "green" | "amber" | "red" | "none";

export function locationFreshness(updatedAt: Date | null | undefined): Freshness {
  if (!updatedAt) return "none";
  const days = (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);
  if (days <= 2) return "green";
  if (days <= 5) return "amber";
  return "red";
}

export function freshnessBadgeClass(freshness: Freshness): string {
  if (freshness === "green") return "badge-green";
  if (freshness === "amber") return "badge-amber";
  if (freshness === "red") return "badge-red";
  return "badge-slate";
}
