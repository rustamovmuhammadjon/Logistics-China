import { isAdminAuthenticated } from "@/lib/auth";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export type ViewerContext =
  | { kind: "admin" }
  | { kind: "consignee"; userId: string }
  | { kind: "operator"; userId: string; linkedConsigneeIds: Set<string> }
  | { kind: "guest" };

/** Figures out who's looking at the monitoring pages, for role-aware links and nav. */
export async function getViewerContext(): Promise<ViewerContext> {
  if (await isAdminAuthenticated()) return { kind: "admin" };

  const user = await getCurrentUser();
  if (!user) return { kind: "guest" };

  if (user.role === "CONSIGNEE") return { kind: "consignee", userId: user.id };

  const links = await prisma.operatorLink.findMany({
    where: { operatorId: user.id },
    select: { consigneeId: true },
  });
  return { kind: "operator", userId: user.id, linkedConsigneeIds: new Set(links.map((l) => l.consigneeId)) };
}

/** Where clicking this order should go: the most-privileged edit page the viewer has, or read-only tracking. */
export function getOrderHref(order: { id: string; ownerId: string | null }, ctx: ViewerContext): string {
  if (ctx.kind === "admin") return `/admin/orders/${order.id}`;
  if (ctx.kind === "consignee" && order.ownerId === ctx.userId) return `/dashboard/orders/${order.id}`;
  if (ctx.kind === "operator" && order.ownerId && ctx.linkedConsigneeIds.has(order.ownerId)) {
    return `/dashboard/orders/${order.id}`;
  }
  return `/track/${order.id}`;
}
