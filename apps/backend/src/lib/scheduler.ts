import cron from "node-cron";
import { sendBukharaArrivalsReport } from "./telegram.js";

// Every day at 09:00 Tashkent time — which trucks are currently sitting at
// Bukhara, straight to the ops Telegram group. Silently does nothing if the
// bot isn't configured (local dev, or before the env vars are set in
// Railway), rather than crashing the whole server on a missing credential.
export function startScheduledJobs() {
  cron.schedule(
    "0 9 * * *",
    async () => {
      if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) return;
      try {
        await sendBukharaArrivalsReport();
      } catch (err) {
        console.error("Scheduled Bukhara report failed:", err);
      }
    },
    { timezone: "Asia/Tashkent" }
  );
}
