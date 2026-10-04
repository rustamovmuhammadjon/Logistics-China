import type { ChatConversation, ChatMessage, ChatSender } from "@prisma/client";
import { prisma } from "./prisma.js";
import { badRequest, notFound } from "./errors.js";
import { notifyUser } from "./realtime.js";

const MAX_MESSAGE_LENGTH = 2000;
const THREAD_PAGE = 200;

export function toChatMessage(message: ChatMessage) {
  return {
    id: message.id,
    sender: message.sender,
    text: message.text,
    createdAt: message.createdAt.toISOString(),
  };
}

function personName(user: { firstName: string | null; lastName: string | null; email: string }) {
  return [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;
}

// A driver and an operator may talk once that operator has paired the
// driver on a trip — the operator who issued the code is their dispatcher.
async function assertChatAllowed(driverId: string, operatorId: string) {
  const pairing = await prisma.driverAssignment.findFirst({
    where: { driverId, createdByUserId: operatorId },
    select: { id: true },
  });
  if (!pairing) notFound("Conversation not found");
}

function findConversation(driverId: string, operatorId: string) {
  return prisma.chatConversation.findUnique({ where: { driverId_operatorId: { driverId, operatorId } } });
}

async function unreadFor(conversation: ChatConversation, reader: ChatSender) {
  const readAt = reader === "DRIVER" ? conversation.driverLastReadAt : conversation.operatorLastReadAt;
  return prisma.chatMessage.count({
    where: {
      conversationId: conversation.id,
      sender: reader === "DRIVER" ? "OPERATOR" : "DRIVER",
      ...(readAt ? { createdAt: { gt: readAt } } : {}),
    },
  });
}

async function lastMessageOf(conversationId: string) {
  const last = await prisma.chatMessage.findFirst({ where: { conversationId }, orderBy: { createdAt: "desc" } });
  return last ? toChatMessage(last) : null;
}

async function readThread(conversation: ChatConversation | null, reader: ChatSender) {
  if (!conversation) return [];
  const messages = await prisma.chatMessage.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: "desc" },
    take: THREAD_PAGE,
  });
  // Mark read only when there is something new from the other side, so an
  // open thread polling every few seconds doesn't write on every poll.
  const readAt = reader === "DRIVER" ? conversation.driverLastReadAt : conversation.operatorLastReadAt;
  const otherSide: ChatSender = reader === "DRIVER" ? "OPERATOR" : "DRIVER";
  const hasNew = messages.some((m) => m.sender === otherSide && (!readAt || m.createdAt > readAt));
  if (hasNew) {
    await prisma.chatConversation.update({
      where: { id: conversation.id },
      data: reader === "DRIVER" ? { driverLastReadAt: new Date() } : { operatorLastReadAt: new Date() },
    });
  }
  return messages.reverse().map(toChatMessage);
}

async function postMessage(driverId: string, operatorId: string, sender: ChatSender, rawText: unknown) {
  await assertChatAllowed(driverId, operatorId);
  const text = typeof rawText === "string" ? rawText.trim() : "";
  if (!text) badRequest("Message is empty");
  if (text.length > MAX_MESSAGE_LENGTH) badRequest("Message is too long");

  const now = new Date();
  const ownRead = sender === "DRIVER" ? { driverLastReadAt: now } : { operatorLastReadAt: now };
  const conversation = await prisma.chatConversation.upsert({
    where: { driverId_operatorId: { driverId, operatorId } },
    create: { driverId, operatorId, lastMessageAt: now, ...ownRead },
    update: { lastMessageAt: now, ...ownRead },
  });
  const message = await prisma.chatMessage.create({
    data: { conversationId: conversation.id, sender, text, createdAt: now },
  });
  // The phone app polls; only the operator's open browser tabs get pushed to.
  if (sender === "DRIVER") notifyUser(operatorId, { type: "chat", driverId });
  return toChatMessage(message);
}

// ---- Driver side ----

export async function listDriverChats(driverId: string) {
  const pairings = await prisma.driverAssignment.findMany({
    where: { driverId, createdByUserId: { not: null } },
    orderBy: { createdAt: "desc" },
    select: { createdByUserId: true, status: true },
  });
  const operatorIds = [...new Set(pairings.map((p) => p.createdByUserId as string))];
  if (operatorIds.length === 0) return [];
  const currentOperatorId = pairings.find((p) => p.status === "ACTIVE")?.createdByUserId ?? null;

  const [operators, conversations] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: operatorIds } },
      select: { id: true, firstName: true, lastName: true, email: true, phone: true, company: { select: { companyName: true } } },
    }),
    prisma.chatConversation.findMany({ where: { driverId, operatorId: { in: operatorIds } } }),
  ]);
  const byOperator = new Map(conversations.map((c) => [c.operatorId, c]));

  const summaries = await Promise.all(
    operators.map(async (operator) => {
      const conversation = byOperator.get(operator.id);
      return {
        operator: {
          id: operator.id,
          name: personName(operator),
          companyName: operator.company?.companyName ?? null,
          phone: operator.phone,
        },
        current: operator.id === currentOperatorId,
        lastMessage: conversation ? await lastMessageOf(conversation.id) : null,
        unread: conversation ? await unreadFor(conversation, "DRIVER") : 0,
      };
    })
  );
  return summaries.sort((a, b) => {
    if (a.current !== b.current) return a.current ? -1 : 1;
    return (b.lastMessage?.createdAt ?? "").localeCompare(a.lastMessage?.createdAt ?? "");
  });
}

export async function driverUnreadCount(driverId: string) {
  const conversations = await prisma.chatConversation.findMany({ where: { driverId } });
  const counts = await Promise.all(conversations.map((c) => unreadFor(c, "DRIVER")));
  return counts.reduce((sum, n) => sum + n, 0);
}

export async function driverThread(driverId: string, operatorId: string) {
  await assertChatAllowed(driverId, operatorId);
  return readThread(await findConversation(driverId, operatorId), "DRIVER");
}

export function driverSend(driverId: string, operatorId: string, text: unknown) {
  return postMessage(driverId, operatorId, "DRIVER", text);
}

// ---- Operator side ----

export async function listOperatorChats(operatorId: string) {
  const pairings = await prisma.driverAssignment.findMany({
    where: { createdByUserId: operatorId, driverId: { not: null } },
    orderBy: { createdAt: "desc" },
    include: {
      driver: true,
      truck: { select: { plateNumber: true, subOrder: { select: { name: true, groupOrder: { select: { name: true } } } } } },
    },
  });

  // Newest pairing per driver stands for "their latest trip with me".
  const latestByDriver = new Map<string, (typeof pairings)[number]>();
  for (const pairing of pairings) {
    if (pairing.driverId && !latestByDriver.has(pairing.driverId)) latestByDriver.set(pairing.driverId, pairing);
  }
  const driverIds = [...latestByDriver.keys()];
  if (driverIds.length === 0) return [];

  const conversations = await prisma.chatConversation.findMany({ where: { operatorId, driverId: { in: driverIds } } });
  const byDriver = new Map(conversations.map((c) => [c.driverId, c]));

  const summaries = await Promise.all(
    driverIds.map(async (driverId) => {
      const pairing = latestByDriver.get(driverId)!;
      const driver = pairing.driver!;
      const conversation = byDriver.get(driverId);
      return {
        driver: { id: driver.id, firstName: driver.firstName, lastName: driver.lastName, phone: driver.phone },
        latestTrip: {
          plateNumber: pairing.truck.plateNumber,
          reference: pairing.truck.subOrder.groupOrder.name,
          subOrderName: pairing.truck.subOrder.name,
          active: pairing.status === "ACTIVE",
        },
        lastMessage: conversation ? await lastMessageOf(conversation.id) : null,
        unread: conversation ? await unreadFor(conversation, "OPERATOR") : 0,
        pairedAt: pairing.createdAt.toISOString(),
      };
    })
  );
  // Conversations with recent messages first, then everyone else by how
  // recently they were paired.
  return summaries.sort((a, b) =>
    (b.lastMessage?.createdAt ?? b.pairedAt).localeCompare(a.lastMessage?.createdAt ?? a.pairedAt)
  );
}

export async function operatorUnreadCount(operatorId: string) {
  const conversations = await prisma.chatConversation.findMany({ where: { operatorId } });
  const counts = await Promise.all(conversations.map((c) => unreadFor(c, "OPERATOR")));
  return counts.reduce((sum, n) => sum + n, 0);
}

export async function operatorThread(operatorId: string, driverId: string) {
  await assertChatAllowed(driverId, operatorId);
  return readThread(await findConversation(driverId, operatorId), "OPERATOR");
}

export function operatorSend(operatorId: string, driverId: string, text: unknown) {
  return postMessage(driverId, operatorId, "OPERATOR", text);
}
