import type { Request } from "express";
import { badRequest } from "./errors.js";

export function routeParam(req: Request, name: string): string {
  const value = req.params[name];
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) badRequest(`Missing :${name}`);
  return raw;
}

export function optionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function requiredString(value: unknown, field: string): string {
  const parsed = optionalString(value);
  if (!parsed) throw new Error(`"${field}" is required`);
  return parsed;
}

export function optionalFloat(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : null;
}

export function requiredNumber(value: unknown, field: string): number {
  const parsed = optionalFloat(value);
  if (parsed === null) badRequest(`"${field}" is required`);
  return parsed;
}

export function truthyFlag(value: unknown): boolean {
  return value === true || value === "true" || value === "on" || value === "1";
}

export function normalizePhone(value: unknown): string {
  const raw = requiredString(value, "phone");
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 9 || digits.length > 15) badRequest("Enter a valid phone number");
  return digits;
}

// Plates are letters/digits only — no spaces, hyphens, or any other
// punctuation — uppercased, and Latin-only (toUpperCase() leaves non-Latin
// letters as non-A-Z characters, so the A-Z0-9 filter drops them too).
function cleanPlateChars(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function normalizePlate(value: unknown, field = "plateNumber"): string {
  const plate = cleanPlateChars(requiredString(value, field));
  if (plate.length < 3) badRequest(`"${field}" looks too short`);
  return plate;
}

export function optionalPlate(value: unknown): string | null {
  const raw = optionalString(value);
  return raw ? cleanPlateChars(raw) : null;
}

// Display phone numbers (Truck.driverPhone, User.phone) — distinct from
// normalizePhone() above, which strips to bare digits for driver-assignment
// pairing lookups and must stay that way for existing pairings to keep
// matching. These instead keep the "+<country code><number>" (E.164) shape
// the frontend's phone input already sends, since the whole point here is
// to show a real, correctly formatted international number.
const E164_PATTERN = /^\+[1-9]\d{6,14}$/;

export function optionalDisplayPhone(value: unknown, field = "phone"): string | null {
  const raw = optionalString(value);
  if (!raw) return null;
  const cleaned = raw.replace(/[\s()-]/g, "");
  if (!E164_PATTERN.test(cleaned)) badRequest(`Enter a valid "${field}" number, including the country code`);
  return cleaned;
}

export function requiredDisplayPhone(value: unknown, field = "phone"): string {
  const result = optionalDisplayPhone(value, field);
  if (!result) badRequest(`"${field}" is required`);
  return result;
}

export function optionalDate(value: unknown): Date | null {
  const raw = optionalString(value);
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Same as optionalDate, but falls back to today when nothing was entered. */
export function dateOrToday(value: unknown): Date {
  return optionalDate(value) ?? new Date();
}

export function parseDateOfBirth(value: unknown, required = false): Date | null {
  const parsed = optionalDate(value);
  if (!parsed) {
    if (required) badRequest("Date of birth is required");
    return null;
  }
  const now = new Date();
  let age = now.getFullYear() - parsed.getFullYear();
  const monthDelta = now.getMonth() - parsed.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < parsed.getDate())) age -= 1;
  if (age < 12 || age > 120) badRequest("Enter a valid date of birth");
  return parsed;
}

export function safeNextPath(next: unknown): string {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//")) {
    return "/";
  }
  return next;
}
