export type UserRole = "CONSIGNEE" | "OPERATOR";
export type MediaType = "IMAGE" | "VIDEO";
export type SubOrderStatus = "OPEN" | "CLOSED" | "CANCELED";
export type OrderSort = "newest" | "oldest";

// A sub-order's cargo can only be moved (перекид) this many times before
// transferring is disabled for it.
export const MAX_TRANSFERS_PER_SUB_ORDER = 3;

export type UserPublic = {
  id: string;
  email: string;
  role: UserRole;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  photoUrl: string | null;
  linkCode: string;
  dateOfBirth: string | null;
};

export type AuthMe = {
  admin: boolean;
  user: UserPublic | null;
};

export type ViewerContext =
  | { kind: "admin" }
  | { kind: "consignee"; userId: string }
  | { kind: "operator"; userId: string; linkedConsigneeIds: string[] }
  | { kind: "guest" };

export type CommentDto = {
  id: string;
  text: string;
  author: string | null;
  createdAt: string;
  groupOrderId: string | null;
  subOrderId: string | null;
  truckId: string | null;
};

export type MediaDto = {
  id: string;
  url: string;
  type: MediaType;
  fileName: string | null;
  createdAt: string;
  truckId: string;
};

export type DriverAssignmentStatus = "PENDING" | "ACTIVE" | "REVOKED";

export type DriverAssignmentDto = {
  id: string;
  truckId: string;
  phoneNormalized: string;
  status: DriverAssignmentStatus;
  claimedAt: string | null;
  lastLat: number | null;
  lastLng: number | null;
  lastLocationText: string | null;
  lastPingAt: string | null;
  pairingExpiresAt: string | null;
  createdAt: string;
  createdByLabel: string | null;
};

export type CargoTransferDto = {
  id: string;
  fromTruckId: string;
  toTruckId: string;
  keepTrailer?: boolean;
  fromPlate?: string | null;
  toPlate?: string | null;
  fromTrailer?: string | null;
  toTrailer?: string | null;
  transferDate: string | null;
  comment: string | null;
  createdAt: string;
  fromTruck?: { id: string; plateNumber: string | null; trailerPlateNumber?: string | null };
  toTruck?: { id: string; plateNumber: string | null; trailerPlateNumber?: string | null };
};

export type TruckDto = {
  id: string;
  subOrderId: string;
  plateNumber: string | null;
  trailerPlateNumber: string | null;
  driverName: string | null;
  driverPhone: string | null;
  lengthM: number | null;
  widthM: number | null;
  heightM: number | null;
  cargoWeight: number | null;
  cargoDescription: string | null;
  currentLocation: string | null;
  locationUpdatedAt: string | null;
  lastLat?: number | null;
  lastLng?: number | null;
  canceledAt?: string | null;
  createdAt: string;
  updatedAt: string;
  media?: MediaDto[];
  comments?: CommentDto[];
  transfersFrom?: CargoTransferDto[];
  transfersTo?: CargoTransferDto[];
  assignments?: DriverAssignmentDto[];
};

export type SubOrderDto = {
  id: string;
  name: string | null;
  openedAt: string | null;
  arrivedAt: string | null;
  status: SubOrderStatus;
  factoryLoadDate: string | null;
  statusText: string | null;
  statusUpdatedAt: string | null;
  groupOrderId: string;
  createdAt: string;
  updatedAt: string;
  trucks: TruckDto[];
  comments?: CommentDto[];
};

export type GroupOrderDto = {
  id: string;
  name: string;
  openedAt: string | null;
  arrivedAt: string | null;
  ownerId: string | null;
  owner?: UserPublic | null;
  operators?: UserPublic[];
  pol: string | null;
  origin: string | null;
  destination: string | null;
  commodity: string | null;
  statusText: string | null;
  statusUpdatedAt: string | null;
  canceledAt?: string | null;
  createdAt: string;
  updatedAt: string;
  subOrders: SubOrderDto[];
  comments?: CommentDto[];
};

export type AdminUserDto = UserPublic & {
  createdAt: string;
  ownedOrderCount: number;
};

export type LinkedAccountDto = {
  linkId: string;
  email: string;
  createdAt: string;
};

export type SidebarOrderDto = {
  id: string;
  name: string;
  ownerId: string | null;
};

export type MonitoringResponse = {
  orders: GroupOrderDto[];
  ctx: ViewerContext;
  stats: { total: number };
  user?: UserPublic | null;
};

export type DashboardResponse = {
  user: UserPublic;
  orders: GroupOrderDto[];
  links: LinkedAccountDto[];
};

export type SignedUploadResponse = {
  path: string;
  token: string;
  signedUrl: string;
  publicUrl: string;
};

export const NAME_PATTERN = /^[\p{L}\s]+$/u;
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD_LENGTH = 8;

export function isLettersOnly(value: string): boolean {
  return NAME_PATTERN.test(value);
}

export function truckStats(trucks: { canceledAt?: string | Date | null }[]) {
  const active = trucks.filter((t) => !t.canceledAt);
  return { total: active.length };
}

/** Total перекид transfers already recorded for a sub-order's trucks. */
export function transferCountOf(trucks: { transfersFrom?: unknown[] | null }[]): number {
  return trucks.reduce((sum, t) => sum + (t.transfersFrom?.length ?? 0), 0);
}

export function canAddTransfer(trucks: { transfersFrom?: unknown[] | null }[]): boolean {
  return transferCountOf(trucks) < MAX_TRANSFERS_PER_SUB_ORDER;
}

export function hasTransferredOut(truck: { transfersFrom?: unknown[] | null }) {
  return Array.isArray(truck.transfersFrom) && truck.transfersFrom.length > 0;
}

export function isCurrentTruck(truck: {
  canceledAt?: string | Date | null;
  transfersFrom?: unknown[] | null;
}) {
  return !truck.canceledAt && !hasTransferredOut(truck);
}

export function isActiveTruck(truck: {
  canceledAt?: string | Date | null;
  transfersFrom?: unknown[] | null;
}) {
  return isCurrentTruck(truck);
}

export function currentTruckOf<T extends {
  canceledAt?: string | Date | null;
  transfersFrom?: unknown[] | null;
  createdAt?: string | Date;
}>(trucks: T[]): T | null {
  const current = trucks.filter(isCurrentTruck);
  if (current.length === 0) return null;
  return [...current].sort((a, b) => String(a.createdAt ?? "").localeCompare(String(b.createdAt ?? ""))).at(-1) ?? null;
}

export function isGroupOrderCompleted(order: {
  canceledAt?: string | Date | null;
  subOrders: { status: SubOrderStatus }[];
}) {
  if (order.canceledAt) return false;
  const hasOpen = order.subOrders.some((sub) => sub.status === "OPEN");
  const hasClosed = order.subOrders.some((sub) => sub.status === "CLOSED");
  return hasClosed && !hasOpen;
}

export function isGroupOrderLocked(order: {
  canceledAt?: string | Date | null;
  subOrders: { status: SubOrderStatus }[];
}) {
  return Boolean(order.canceledAt) || isGroupOrderCompleted(order);
}

export function truckRoleLabel(truck: {
  canceledAt?: string | Date | null;
  transfersFrom?: unknown[] | null;
}) {
  if (truck.canceledAt) return "Cancelled";
  if (hasTransferredOut(truck)) return "Transferred";
  return "Current";
}

export function subOrderStatusLabel(status: SubOrderStatus) {
  if (status === "CANCELED") return "Cancelled";
  if (status === "CLOSED") return "Completed";
  return "Open";
}

export function formatDirection(
  origin: string | null | undefined,
  destination: string | null | undefined
): string | null {
  if (!origin && !destination) return null;
  return `${origin || "?"} → ${destination || "?"}`;
}

// Volume is derived from the sub-order count, not entered by hand — a
// transfer only moves cargo between trucks, it never changes how many
// FTL loads the order represents.
export function formatVolume(subOrderCount: number): string {
  return `${subOrderCount}xFTL`;
}

export function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDate(value: string | Date | null | undefined): string {
  const date = toDate(value);
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(value: string | Date | null | undefined): string {
  const date = toDate(value);
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function toDateInputValue(value: string | Date | null | undefined): string {
  const date = toDate(value);
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

export type Freshness = "green" | "amber" | "red" | "none";

export function locationFreshness(value: string | Date | null | undefined): Freshness {
  const updatedAt = toDate(value);
  if (!updatedAt) return "none";
  const days = (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);
  if (days <= 2) return "green";
  if (days <= 5) return "amber";
  return "red";
}

export function gpsFreshness(value: string | Date | null | undefined): Freshness {
  const updatedAt = toDate(value);
  if (!updatedAt) return "none";
  const hours = (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60);
  if (hours <= 4) return "green";
  if (hours <= 10) return "amber";
  return "red";
}

export function freshnessBadgeClass(freshness: Freshness): string {
  if (freshness === "green") return "badge-green";
  if (freshness === "amber") return "badge-amber";
  if (freshness === "red") return "badge-red";
  return "badge-slate";
}

export function normalizeSort(sort: string | undefined): OrderSort {
  return sort === "oldest" ? "oldest" : "newest";
}

export function ownOrdersOnly<T extends { ownerId: string | null }>(
  orders: T[],
  user: { id: string; role: string } | null | undefined,
  ctx: ViewerContext
): T[] {
  if (user?.role === "CONSIGNEE") return orders.filter((order) => order.ownerId === user.id);
  if (ctx.kind === "consignee") return orders.filter((order) => order.ownerId === ctx.userId);
  return orders;
}

export function withOwnOrders(
  data: MonitoringResponse,
  user?: { id: string; role: string } | null
): MonitoringResponse {
  const orders = ownOrdersOnly(data.orders, user, data.ctx);
  const stats = truckStats(orders.flatMap((order) => order.subOrders.flatMap((sub) => sub.trucks)));
  return { ...data, orders, stats };
}

export function getOrderHref(
  order: { id: string; ownerId: string | null },
  ctx: ViewerContext
): string {
  if (ctx.kind === "admin") return `/admin/orders/${order.id}`;
  if (ctx.kind === "consignee" && order.ownerId === ctx.userId) return `/dashboard/orders/${order.id}`;
  if (ctx.kind === "operator" && order.ownerId && ctx.linkedConsigneeIds.includes(order.ownerId)) {
    return `/dashboard/orders/${order.id}`;
  }
  return `/track/${order.id}`;
}

export function displayName(user: Pick<UserPublic, "firstName" | "lastName" | "email">): string {
  return [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;
}

export function ageFromDob(value: string | Date | null | undefined): number | null {
  const date = toDate(value);
  if (!date) return null;
  const now = new Date();
  let age = now.getFullYear() - date.getFullYear();
  const monthDelta = now.getMonth() - date.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < date.getDate())) age -= 1;
  return age >= 0 && age < 130 ? age : null;
}
