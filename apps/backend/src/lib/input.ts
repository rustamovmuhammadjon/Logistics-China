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

export function optionalDate(value: unknown): Date | null {
  const raw = optionalString(value);
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
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
