import { prisma } from "./prisma.js";
import { formatDateTime } from "@logistics/shared";

function botToken() {
  return process.env.TELEGRAM_BOT_TOKEN || "";
}

function chatId() {
  return process.env.TELEGRAM_CHAT_ID || "";
}

export async function sendTelegramMessage(text: string) {
  const token = botToken();
  const chat = chatId();
  if (!token || !chat) {
    throw new Error("TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID is not set");
  }
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chat,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Telegram API error (${res.status}): ${body}`);
  }
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// A truck counts as "at Bukhara" by its free-text currentLocation alone —
// matches either spelling (operators type "Bukhara", track718 sends
// "Buxoro") — and only while it's still the live, current truck on an
// open sub-order of an active order. A completed/cancelled job, or a
// truck that already handed cargo off to the next one, isn't "ops" news
// anymore. Also restricted to trucks registered in Uzbekistan, Kazakhstan,
// or China — other countries' trucks aren't reported even if they're
// currently sitting at Bukhara.
export async function findTrucksAtBukhara() {
  return prisma.truck.findMany({
    where: {
      canceledAt: null,
      transfersFrom: { none: {} },
      AND: [
        {
          OR: [
            { currentLocation: { contains: "bukhara", mode: "insensitive" } },
            { currentLocation: { contains: "buxoro", mode: "insensitive" } },
          ],
        },
        {
          OR: [
            { country: { contains: "uzbekistan", mode: "insensitive" } },
            { country: { contains: "kazakhstan", mode: "insensitive" } },
            { country: { contains: "china", mode: "insensitive" } },
          ],
        },
      ],
      subOrder: {
        status: "OPEN",
        groupOrder: { canceledAt: null },
      },
    },
    include: {
      subOrder: { include: { groupOrder: true } },
    },
    orderBy: { locationUpdatedAt: "desc" },
  });
}

export async function sendBukharaArrivalsReport() {
  const trucks = await findTrucksAtBukhara();
  const today = new Intl.DateTimeFormat("uz-UZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Tashkent",
  }).format(new Date());

  if (trucks.length === 0) {
    await sendTelegramMessage(`🚛 <b>Buxoroda moshinalar</b> — ${today}\n\nBugun Buxoroda joylashgan moshina yo'q.`);
    return { count: 0 };
  }

  const lines = trucks.map((truck, index) => {
    const order = truck.subOrder.groupOrder;
    const sub = truck.subOrder;
    const parts = [
      `<b>${index + 1}. ${escapeHtml(order.name)}</b>${sub.name ? ` / ${escapeHtml(sub.name)}` : ""}`,
      `🚚 Truck: ${escapeHtml(truck.plateNumber || "—")}${truck.trailerPlateNumber ? ` / Trailer: ${escapeHtml(truck.trailerPlateNumber)}` : ""}`,
    ];
    if (truck.driverName || truck.driverPhone) {
      parts.push(`👤 Haydovchi: ${escapeHtml([truck.driverName, truck.driverPhone].filter(Boolean).join(", ") || "—")}`);
    }
    if (truck.country) parts.push(`🌍 Davlat: ${escapeHtml(truck.country)}`);
    if (truck.cargoWeight != null) parts.push(`⚖️ Og'irlik: ${truck.cargoWeight} t`);
    parts.push(`📍 Joylashuv: ${escapeHtml(truck.currentLocation || "—")}`);
    if (truck.locationUpdatedAt) parts.push(`🕒 Yangilangan: ${formatDateTime(truck.locationUpdatedAt)}`);
    return parts.join("\n");
  });

  const text = `🚛 <b>Buxoroda joylashgan moshinalar</b> — ${today}\n\n${lines.join("\n\n")}\n\nJami: ${trucks.length} ta moshina`;
  await sendTelegramMessage(text);
  return { count: trucks.length };
}
