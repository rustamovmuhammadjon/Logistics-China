import type { Prisma, User } from "@prisma/client";
import { EMAIL_PATTERN } from "@logistics/shared";
import { prisma } from "./prisma.js";
import { badRequest, conflict, notFound, unauthorized } from "./errors.js";
import { optionalDisplayPhone, optionalString, requiredString } from "./input.js";
import { optionalText } from "./drivers.js";

export const agentPublicSelect = {
  id: true,
  name: true,
  company: true,
  phone: true,
  email: true,
  location: true,
  note: true,
} satisfies Prisma.AgentSelect;

export const subOrderAgentsInclude = {
  orderBy: { createdAt: "asc" as const },
  include: { agent: { select: agentPublicSelect } },
} satisfies Prisma.SubOrder$agentsArgs;

// A tracking company's operators share its directory; an operator without a
// company keeps their own.
export function agentOwnerId(user: User | null): string {
  if (user?.role === "OPERATOR_COMPANY") return user.id;
  if (user?.role === "OPERATOR") return user.companyId ?? user.id;
  unauthorized();
}

function parseAgentFields(body: Record<string, unknown>) {
  const name = requiredString(body.name, "name").replace(/\s+/g, " ");
  if (name.length > 120) badRequest('"name" is too long');
  const email = optionalString(body.email);
  if (email && (email.length > 120 || !EMAIL_PATTERN.test(email))) badRequest("Enter a valid email address");
  return {
    name,
    company: optionalText(body.company, 120, "company"),
    phone: optionalDisplayPhone(body.phone),
    email: email?.toLowerCase() ?? null,
    location: optionalText(body.location, 120, "location"),
    note: optionalText(body.note, 500, "note"),
  };
}

export async function listAgents(ownerId: string) {
  const agents = await prisma.agent.findMany({
    where: { ownerId, archivedAt: null },
    orderBy: { name: "asc" },
    select: {
      ...agentPublicSelect,
      createdByLabel: true,
      createdAt: true,
      _count: { select: { subOrders: { where: { subOrder: { status: "OPEN" } } } } },
    },
  });
  return agents.map(({ _count, ...agent }) => ({ ...agent, attachedCount: _count.subOrders }));
}

export async function createAgent(ownerId: string, body: Record<string, unknown>, label: string) {
  return prisma.agent.create({
    data: { ownerId, ...parseAgentFields(body), createdByLabel: label },
    select: agentPublicSelect,
  });
}

async function ownedAgent(ownerId: string, agentId: string) {
  const agent = await prisma.agent.findUnique({ where: { id: agentId } });
  if (!agent || agent.ownerId !== ownerId || agent.archivedAt) notFound("Agent not found");
  return agent;
}

export async function updateAgent(ownerId: string, agentId: string, body: Record<string, unknown>) {
  await ownedAgent(ownerId, agentId);
  return prisma.agent.update({ where: { id: agentId }, data: parseAgentFields(body), select: agentPublicSelect });
}

// Archived, not deleted: every sub-order it was attached to keeps showing it.
export async function archiveAgent(ownerId: string, agentId: string) {
  await ownedAgent(ownerId, agentId);
  await prisma.agent.update({ where: { id: agentId }, data: { archivedAt: new Date() } });
}

// Only from the operator's own directory, and only once the sub-order has a
// vehicle on it.
export async function attachAgent(subOrderId: string, agentIdRaw: unknown, operator: User) {
  const agentId = requiredString(agentIdRaw, "agentId");
  await ownedAgent(agentOwnerId(operator), agentId);
  const hasTruck = await prisma.truck.count({ where: { subOrderId, canceledAt: null } });
  if (hasTruck === 0) badRequest("Assign a vehicle to this sub-order before attaching an agent");
  const existing = await prisma.subOrderAgent.findUnique({ where: { subOrderId_agentId: { subOrderId, agentId } } });
  if (existing) conflict("This agent is already attached to this sub-order");
  return prisma.subOrderAgent.create({
    data: { subOrderId, agentId, attachedByLabel: operator.email },
    include: { agent: { select: agentPublicSelect } },
  });
}

export async function detachAgent(subOrderId: string, agentId: string) {
  const { count } = await prisma.subOrderAgent.deleteMany({ where: { subOrderId, agentId } });
  if (count === 0) notFound("This agent isn't attached to this sub-order");
}
