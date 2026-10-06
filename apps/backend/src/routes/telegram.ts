import { Router } from "express";
import { handleTelegramUpdate, isValidWebhookSecret, type TelegramUpdate } from "../lib/telegram.js";

export const telegramWebhookRouter = Router();

// Telegram calls this for button presses and commands. Both the URL path
// and Telegram's secret-token header must match before anything is read.
telegramWebhookRouter.post("/:secret", (req, res) => {
  if (!isValidWebhookSecret(req.params.secret) || !isValidWebhookSecret(req.get("x-telegram-bot-api-secret-token"))) {
    res.sendStatus(404);
    return;
  }
  // Answer at once — Telegram retries anything slow, which would make the
  // bot reply twice.
  res.sendStatus(200);
  void handleTelegramUpdate(req.body as TelegramUpdate).catch((err) =>
    console.error("Telegram update failed:", err)
  );
});
