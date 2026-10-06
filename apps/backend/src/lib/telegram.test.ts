import { afterEach, describe, expect, it } from "vitest";
import {
  isValidWebhookSecret,
  matchesBukhara,
  recipientChatIds,
  splitMessage,
  telegramWebhookSecret,
} from "./telegram.js";

describe("recipientChatIds", () => {
  it("accepts a group and a user, comma or space separated, without duplicates", () => {
    expect(recipientChatIds("-1003939614581, 1273990156")).toEqual(["-1003939614581", "1273990156"]);
    expect(recipientChatIds("1273990156 1273990156")).toEqual(["1273990156"]);
    expect(recipientChatIds("")).toEqual([]);
  });
});

describe("matchesBukhara", () => {
  it("matches every spelling operators, track718 and phones produce", () => {
    for (const place of ["Bukhara", "BUXORO VILOYATI", "Buxoro, Uzbekistan", "Бухара", "Бухарская область", "Bukhoro"]) {
      expect(matchesBukhara(place), place).toBe(true);
    }
  });

  it("does not match other places or empty values", () => {
    expect(matchesBukhara("Samarkand")).toBe(false);
    expect(matchesBukhara(null)).toBe(false);
  });
});

describe("splitMessage", () => {
  it("keeps short text as one message", () => {
    expect(splitMessage("a\n\nb")).toEqual(["a\n\nb"]);
  });

  it("splits between truck blocks, never inside one, and stays under the limit", () => {
    const block = "x".repeat(40);
    const chunks = splitMessage(Array(10).fill(block).join("\n\n"), 100);
    expect(chunks.every((c) => c.length <= 100)).toBe(true);
    expect(chunks.join("\n\n")).toBe(Array(10).fill(block).join("\n\n"));
  });

  it("hard-splits a single block longer than the limit", () => {
    const chunks = splitMessage("y".repeat(250), 100);
    expect(chunks.map((c) => c.length)).toEqual([100, 100, 50]);
  });
});

describe("webhook secret", () => {
  const original = process.env.TELEGRAM_BOT_TOKEN;
  afterEach(() => {
    process.env.TELEGRAM_BOT_TOKEN = original;
  });

  it("accepts only the secret derived from the bot token", () => {
    process.env.TELEGRAM_BOT_TOKEN = "123:abc";
    expect(isValidWebhookSecret(telegramWebhookSecret())).toBe(true);
    expect(isValidWebhookSecret("wrong")).toBe(false);
    expect(isValidWebhookSecret(undefined)).toBe(false);
  });

  it("rejects everything when no bot is configured", () => {
    process.env.TELEGRAM_BOT_TOKEN = "";
    expect(isValidWebhookSecret(telegramWebhookSecret())).toBe(false);
  });
});
