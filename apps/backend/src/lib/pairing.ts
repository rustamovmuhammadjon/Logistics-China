import { createHash, randomInt } from "node:crypto";
import { badRequest } from "./errors.js";

const CODE_LENGTH = 8;
// Digits + uppercase Latin letters, with visually ambiguous characters
// (0/O, 1/I/L) dropped so a code read off a phone screen or said aloud
// doesn't get mistyped.
const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const CODE_PATTERN = /^[A-Z0-9]{8}$/;

export const PAIRING_DURATIONS_MINUTES = [15, 30, 60, 180] as const;
export type PairingDurationMinutes = (typeof PAIRING_DURATIONS_MINUTES)[number];

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value) throw new Error("SESSION_SECRET environment variable is not set");
  return value;
}

export function hashPairingCode(code: string) {
  return createHash("sha256").update(`${secret()}:${code}`).digest("hex");
}

export function issuePairingCode() {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[randomInt(0, CODE_ALPHABET.length)];
  }
  return code;
}

export function normalizePairingDuration(minutes: unknown): PairingDurationMinutes {
  const parsed = Number(minutes);
  if (!(PAIRING_DURATIONS_MINUTES as readonly number[]).includes(parsed)) {
    badRequest("Choose a valid expiry: 15, 30, 60, or 180 minutes");
  }
  return parsed as PairingDurationMinutes;
}

export function pairingExpiryDate(minutes: PairingDurationMinutes) {
  return new Date(Date.now() + minutes * 60_000);
}
