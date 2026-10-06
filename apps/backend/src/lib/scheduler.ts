import cron from "node-cron";
import { registerTelegramWebhook, sendBukharaArrivalsReport, telegramConfigured } from "./telegram.js";

// Only the deployed server runs these. Every local dev server shares the
// same bot and database, so running them there too would send duplicates
// and point the bot's webhook at a laptop. TELEGRAM_SCHEDULER=on forces it.
function isDeployedServer() {
  return Boolean(
    process.env.RAILWAY_ENVIRONMENT_NAME || process.env.RAILWAY_ENVIRONMENT || process.env.TELEGRAM_SCHEDULER === "on"
  );
}

export function startBackgroundJobs() {
  if (!isDeployedServer()) return;

  // 10:00 and 14:00 Tashkent time: everything currently sitting at Bukhara.
  cron.schedule(
    "0 10,14 * * *",
    async () => {
      if (!telegramConfigured()) return;
      try {
        await sendBukharaArrivalsReport();
      } catch (err) {
        console.error("Scheduled Bukhara report failed:", err);
      }
    },
    { timezone: "Asia/Tashkent" }
  );

  // So the "Truck in Bukhara" button reaches this server.
  const publicDomain = process.env.RAILWAY_PUBLIC_DOMAIN;
  const baseUrl = process.env.TELEGRAM_WEBHOOK_BASE_URL || (publicDomain ? `https://${publicDomain}` : "");
  if (process.env.TELEGRAM_BOT_TOKEN && baseUrl) {
    registerTelegramWebhook(baseUrl).catch((err) => console.error("Telegram webhook setup failed:", err));
  }
}
