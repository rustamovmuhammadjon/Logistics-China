import { createHash, randomInt, timingSafeEqual } from "node:crypto";

const PAIRING_TTL_MS = 24 * 60 * 60 * 1000;

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value) throw new Error("SESSION_SECRET environment variable is not set");
  return value;
}

export function hashPairingCode(phoneNormalized: string, code: string) {
  return createHash("sha256").update(`${secret()}:${phoneNormalized}:${code}`).digest("hex");
}

export function pairingCodesMatch(storedHash: string, phoneNormalized: string, code: string) {
  const left = Buffer.from(storedHash);
  const right = Buffer.from(hashPairingCode(phoneNormalized, code));
  return left.length === right.length && timingSafeEqual(left, right);
}

export function issuePairingCode() {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function pairingExpiryDate() {
  return new Date(Date.now() + PAIRING_TTL_MS);
}
