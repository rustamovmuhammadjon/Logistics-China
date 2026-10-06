import { createHash, timingSafeEqual } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { formatDateTime } from "@logistics/shared";
import { prisma } from "./prisma.js";
import { documentsBucket } from "./documents.js";
import { getSupabaseAdmin } from "./supabase.js";

export const BUKHARA_BUTTON_TEXT = "🚛 Truck in Bukhara";
const BUKHARA_CALLBACK = "bukhara";
// Telegram rejects messages over 4096 characters; leave room for markup.
const MAX_MESSAGE_LENGTH = 3900;

// Operators type "Bukhara", track718 sends "Buxoro", a driver's phone may
// geocode to "Бухара". Both cases of the Cyrillic stem are listed because
// the database's case-insensitive match may only fold ASCII.
const BUKHARA_NAMES = ["bukhara", "buxoro", "bukhoro", "бухар", "Бухар"];
const REPORT_COUNTRIES = ["uzbekistan", "kazakhstan", "china"];

function botToken() {
  return process.env.TELEGRAM_BOT_TOKEN || "";
}

// TELEGRAM_CHAT_ID holds every recipient, comma-separated — the ops group
// and any individual accounts. Only these chats may use the bot's button.
export function recipientChatIds(raw = process.env.TELEGRAM_CHAT_ID ?? ""): string[] {
  return [...new Set(raw.split(/[\s,]+/).filter(Boolean))];
}

export function telegramConfigured() {
  return Boolean(botToken()) && recipientChatIds().length > 0;
}

export function matchesBukhara(location: string | null | undefined): boolean {
  const text = (location ?? "").toLowerCase();
  return BUKHARA_NAMES.some((name) => text.includes(name.toLowerCase()));
}

async function telegram<T = unknown>(method: string, body: Record<string, unknown> | FormData): Promise<T> {
  const token = botToken();
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not set");
  const isForm = body instanceof FormData;
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: isForm ? undefined : { "Content-Type": "application/json" },
    body: isForm ? body : JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; result?: T; description?: string };
  if (!res.ok || !data.ok) throw new Error(`Telegram ${method} failed (${res.status}): ${data.description ?? ""}`);
  return data.result as T;
}

const bukharaInlineButton = { inline_keyboard: [[{ text: BUKHARA_BUTTON_TEXT, callback_data: BUKHARA_CALLBACK }]] };

// Splits on the blank lines between trucks so a block is never cut in half.
export function splitMessage(text: string, limit = MAX_MESSAGE_LENGTH): string[] {
  const chunks: string[] = [];
  let current = "";
  for (const block of text.split("\n\n")) {
    const pieces = block.length > limit ? block.match(new RegExp(`[\\s\\S]{1,${limit}}`, "g"))! : [block];
    for (const piece of pieces) {
      const next = current ? `${current}\n\n${piece}` : piece;
      if (next.length > limit && current) {
        chunks.push(current);
        current = piece;
      } else {
        current = next;
      }
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

async function sendText(chatId: string | number, text: string, replyMarkup: unknown = bukharaInlineButton) {
  const chunks = splitMessage(text);
  for (const [i, chunk] of chunks.entries()) {
    await telegram("sendMessage", {
      chat_id: chatId,
      text: chunk,
      parse_mode: "HTML",
      disable_web_page_preview: true,
      ...(i === chunks.length - 1 && replyMarkup ? { reply_markup: replyMarkup } : {}),
    });
  }
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// "In Bukhara" for the bot: the live truck of an open sub-order on an
// active order, registered in Uzbekistan, Kazakhstan, or China.
function reportableAtBukharaWhere(): Prisma.TruckWhereInput {
  return {
    canceledAt: null,
    transfersFrom: { none: {} },
    AND: [
      { OR: BUKHARA_NAMES.map((name) => ({ currentLocation: { contains: name, mode: "insensitive" as const } })) },
      { OR: REPORT_COUNTRIES.map((country) => ({ country: { contains: country, mode: "insensitive" as const } })) },
    ],
    subOrder: { status: "OPEN", groupOrder: { canceledAt: null } },
  };
}

const truckReportInclude = {
  subOrder: { include: { groupOrder: true } },
  documents: { orderBy: { createdAt: "asc" as const } },
} satisfies Prisma.TruckInclude;

type ReportTruck = Prisma.TruckGetPayload<{ include: typeof truckReportInclude }>;

export async function findTrucksAtBukhara() {
  return prisma.truck.findMany({
    where: reportableAtBukharaWhere(),
    include: truckReportInclude,
    orderBy: { locationUpdatedAt: "desc" },
  });
}

function truckBlock(truck: ReportTruck, heading: string) {
  const sub = truck.subOrder;
  const parts = [
    `<b>${heading}${escapeHtml(sub.groupOrder.name)}</b>${sub.name ? ` / ${escapeHtml(sub.name)}` : ""}`,
    `🚚 Truck: ${escapeHtml(truck.plateNumber || "—")}${truck.trailerPlateNumber ? ` / Trailer: ${escapeHtml(truck.trailerPlateNumber)}` : ""}`,
  ];
  if (truck.driverName || truck.driverPhone) {
    parts.push(`👤 Haydovchi: ${escapeHtml([truck.driverName, truck.driverPhone].filter(Boolean).join(", "))}`);
  }
  if (truck.country) parts.push(`🌍 Davlat: ${escapeHtml(truck.country)}`);
  if (truck.cargoWeight != null) parts.push(`⚖️ Og'irlik: ${truck.cargoWeight} t`);
  parts.push(`📍 Joylashuv: ${escapeHtml(truck.currentLocation || "—")}`);
  if (truck.locationUpdatedAt) parts.push(`🕒 Yangilangan: ${formatDateTime(truck.locationUpdatedAt)}`);
  if (truck.documents.length > 0) parts.push(`📎 Hujjatlar: ${truck.documents.length} ta`);
  return parts.join("\n");
}

function todayInTashkent() {
  return new Intl.DateTimeFormat("uz-UZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Tashkent",
  }).format(new Date());
}

async function bukharaListText() {
  const trucks = await findTrucksAtBukhara();
  const header = `🚛 <b>Buxoroda joylashgan moshinalar</b> — ${todayInTashkent()}`;
  if (trucks.length === 0) return { count: 0, text: `${header}\n\nHozir Buxoroda moshina yo'q.` };
  const blocks = trucks.map((truck, i) => truckBlock(truck, `${i + 1}. `));
  return { count: trucks.length, text: `${header}\n\n${blocks.join("\n\n")}\n\nJami: ${trucks.length} ta moshina` };
}

// One failing chat (e.g. the bot was removed from a group) must not stop
// the others from getting the message.
async function toEveryRecipient(send: (chatId: string) => Promise<void>) {
  let delivered = 0;
  for (const chatId of recipientChatIds()) {
    try {
      await send(chatId);
      delivered++;
    } catch (err) {
      console.error(`Telegram send to ${chatId} failed:`, err);
    }
  }
  return delivered;
}

export async function sendBukharaArrivalsReport() {
  const { count, text } = await bukharaListText();
  const delivered = await toEveryRecipient((chatId) => sendText(chatId, text));
  return { count, delivered };
}

async function downloadDocuments(truck: ReportTruck) {
  const storage = getSupabaseAdmin().storage.from(documentsBucket());
  const files: { name: string; blob: Blob }[] = [];
  for (const doc of truck.documents) {
    const { data, error } = await storage.download(doc.storagePath);
    if (error || !data) {
      console.error(`Could not load document ${doc.id} for Telegram:`, error);
      continue;
    }
    files.push({ name: doc.fileName, blob: data });
  }
  return files;
}

async function notifyBukharaArrival(truckId: string) {
  if (!telegramConfigured()) return;

  // Claim first, atomically: of several near-simultaneous location writes
  // (a GPS ping racing an operator edit), only one sends the alert.
  const claimed = await prisma.truck.updateMany({
    where: { id: truckId, bukharaAlertedAt: null, ...reportableAtBukharaWhere() },
    data: { bukharaAlertedAt: new Date() },
  });
  if (claimed.count === 0) return;

  const truck = await prisma.truck.findUniqueOrThrow({ where: { id: truckId }, include: truckReportInclude });
  const text = `🔔 <b>Buxoroga yetib keldi</b>\n\n${truckBlock(truck, "")}`;
  const files = await downloadDocuments(truck);

  const delivered = await toEveryRecipient(async (chatId) => {
    await sendText(chatId, text);
    for (const file of files) {
      const form = new FormData();
      form.append("chat_id", chatId);
      form.append("document", file.blob, file.name);
      form.append("caption", `📎 ${truck.plateNumber || "Truck"}`);
      // The alert itself already went out; a failed attachment is logged,
      // not treated as an undelivered alert (which would resend the text).
      await telegram("sendDocument", form).catch((err) =>
        console.error(`Telegram document to ${chatId} failed:`, err)
      );
    }
  });

  // Nobody got it (Telegram down, bad config) — let the next location
  // update try again rather than losing the alert for good.
  if (delivered === 0) {
    await prisma.truck.update({ where: { id: truckId }, data: { bukharaAlertedAt: null } });
  }
}

/** Call after any write to a truck's location. Never blocks or fails the request. */
export function checkBukharaArrival(truckId: string) {
  void notifyBukharaArrival(truckId).catch((err) => console.error("Bukhara arrival alert failed:", err));
}

// ---- Incoming updates (the "Truck in Bukhara" button) ----------------------

// Derived from the bot token, so the webhook needs no extra env var: only
// someone holding the token could forge a request that passes this.
export function telegramWebhookSecret() {
  return createHash("sha256").update(`telegram-webhook:${botToken()}`).digest("hex").slice(0, 48);
}

export function isValidWebhookSecret(value: string | undefined) {
  if (!botToken() || !value) return false;
  const expected = Buffer.from(telegramWebhookSecret());
  const actual = Buffer.from(value);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function registerTelegramWebhook(baseUrl: string) {
  await telegram("setWebhook", {
    url: `${baseUrl.replace(/\/$/, "")}/webhooks/telegram/${telegramWebhookSecret()}`,
    secret_token: telegramWebhookSecret(),
    allowed_updates: ["message", "callback_query", "my_chat_member"],
  });
  await telegram("setMyCommands", {
    commands: [{ command: "bukhara", description: "Buxorodagi moshinalar" }],
  });
}

type TelegramChat = { id: number; type: string };
export type TelegramUpdate = {
  message?: { chat: TelegramChat; text?: string };
  callback_query?: { id: string; data?: string; message?: { chat: TelegramChat } };
  my_chat_member?: { chat: TelegramChat; new_chat_member?: { status?: string } };
};

function isAllowedChat(chatId: number) {
  return recipientChatIds().includes(String(chatId));
}

// Driver phones and plates aren't for strangers who find the bot, so an
// unknown chat only learns its own ID (handy when adding a new group).
async function replyNotAllowed(chat: TelegramChat) {
  await sendText(
    chat.id,
    `Bu chatga ruxsat berilmagan.\nChat ID: <code>${chat.id}</code>\nUni serverdagi TELEGRAM_CHAT_ID ro'yxatiga qo'shing.`,
    null
  );
}

async function sendListTo(chat: TelegramChat) {
  if (!isAllowedChat(chat.id)) return replyNotAllowed(chat);
  const { text } = await bukharaListText();
  await sendText(chat.id, text);
}

async function sendWelcome(chat: TelegramChat) {
  if (!isAllowedChat(chat.id)) return replyNotAllowed(chat);
  // A keyboard button's text never reaches a bot in privacy mode inside a
  // group, so groups get the inline button and private chats the keyboard.
  const markup =
    chat.type === "private"
      ? { keyboard: [[{ text: BUKHARA_BUTTON_TEXT }]], resize_keyboard: true, is_persistent: true }
      : bukharaInlineButton;
  await sendText(
    chat.id,
    "Salom! Har kuni 10:00 va 14:00 da Buxorodagi moshinalar ro'yxatini yuboraman, moshina Buxoroga yetib kelganda esa darhol xabar beraman.\n\nHozirgi ro'yxat uchun tugmani bosing.",
    markup
  );
}

export async function handleTelegramUpdate(update: TelegramUpdate) {
  const query = update.callback_query;
  if (query) {
    await telegram("answerCallbackQuery", { callback_query_id: query.id }).catch(() => undefined);
    if (query.data === BUKHARA_CALLBACK && query.message) await sendListTo(query.message.chat);
    return;
  }

  const message = update.message;
  if (message?.text) {
    const command = message.text.trim().split(/\s+/)[0].split("@")[0].toLowerCase();
    if (command === "/start") await sendWelcome(message.chat);
    else if (command === "/bukhara" || /truck in bukhara/i.test(message.text)) await sendListTo(message.chat);
    return;
  }

  const member = update.my_chat_member;
  if (member && ["member", "administrator"].includes(member.new_chat_member?.status ?? "")) {
    await sendWelcome(member.chat);
  }
}
