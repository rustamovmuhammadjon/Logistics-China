import type { DriverTripStatus } from "@logistics/shared";
import { colors } from "./theme";

// Hermes ships without Uzbek locale data on many phones, so dates are
// formatted by hand instead of through Intl.
const MONTHS = ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avg", "sen", "okt", "noy", "dek"];
const MONTHS_LONG = [
  "yanvar",
  "fevral",
  "mart",
  "aprel",
  "may",
  "iyun",
  "iyul",
  "avgust",
  "sentabr",
  "oktabr",
  "noyabr",
  "dekabr",
];
const WEEKDAYS = ["yakshanba", "dushanba", "seshanba", "chorshanba", "payshanba", "juma", "shanba"];

const pad = (n: number) => String(n).padStart(2, "0");

function toDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value: string | null | undefined) {
  const date = toDate(value);
  if (!date) return "—";
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatTime(value: string | null | undefined) {
  const date = toDate(value);
  return date ? `${pad(date.getHours())}:${pad(date.getMinutes())}` : "—";
}

export function formatDateTime(value: string | null | undefined) {
  const date = toDate(value);
  return date ? `${formatDate(value)}, ${formatTime(value)}` : "—";
}

export function formatToday(now = new Date()) {
  return `${WEEKDAYS[now.getDay()]}, ${now.getDate()} ${MONTHS_LONG[now.getMonth()]}`;
}

export function formatRelative(value: string | null | undefined, now = Date.now()) {
  const date = toDate(value);
  if (!date) return "—";
  const minutes = Math.round((now - date.getTime()) / 60_000);
  if (minutes < 1) return "hozirgina";
  if (minutes < 60) return `${minutes} daqiqa oldin`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} soat oldin`;
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return `kecha, ${formatTime(value)}`;
  return formatDateTime(value);
}

export function greeting(now = new Date()) {
  const hour = now.getHours();
  if (hour < 5) return "Xayrli tun";
  if (hour < 12) return "Xayrli tong";
  if (hour < 18) return "Xayrli kun";
  return "Xayrli kech";
}

// The server stores "Place, Region (41.31100, 69.27970)" — the place reads
// better on its own, with the coordinates as a smaller second line.
export function splitLocationLabel(label: string | null | undefined) {
  if (!label) return { place: null, coords: null };
  const match = /^(.*?)\s*\((-?\d+\.\d+,\s*-?\d+\.\d+)\)$/.exec(label.trim());
  if (match) return { place: match[1] || null, coords: match[2] };
  return /^-?\d+\.\d+,\s*-?\d+\.\d+$/.test(label.trim())
    ? { place: null, coords: label.trim() }
    : { place: label, coords: null };
}

export function formatRoute(origin: string | null, destination: string | null) {
  if (!origin && !destination) return null;
  return `${origin || "?"} → ${destination || "?"}`;
}

export function formatWeight(tons: number | null) {
  if (tons == null) return null;
  return `${Number.isInteger(tons) ? tons : tons.toFixed(1)} t`;
}

export function initials(firstName?: string | null, lastName?: string | null) {
  return `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase() || "?";
}

// GPS older than this is shown as stale — the app reports every 3 hours.
export function isPingFresh(value: string | null | undefined, now = Date.now()) {
  const date = toDate(value);
  return Boolean(date && now - date.getTime() < 4 * 60 * 60 * 1000);
}

export const TRIP_STATUS: Record<DriverTripStatus, { label: string; color: string; background: string }> = {
  ACTIVE: { label: "Faol", color: colors.success, background: colors.successSoft },
  COMPLETED: { label: "Yakunlangan", color: colors.textSecondary, background: colors.surfaceAlt },
  CANCELED: { label: "Bekor qilingan", color: colors.danger, background: colors.dangerSoft },
  TRANSFERRED: { label: "Yuk o'tkazilgan", color: colors.warning, background: colors.warningSoft },
  ENDED: { label: "Tugagan", color: colors.textSecondary, background: colors.surfaceAlt },
};

// "DD.MM.YYYY" as typed <-> "YYYY-MM-DD" as stored.
export function isoToDisplayDate(value: string | null | undefined) {
  if (!value) return "";
  const [y, m, d] = value.split("-");
  return y && m && d ? `${d}.${m}.${y}` : "";
}

export function displayDateToIso(value: string): string | null | undefined {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(trimmed);
  if (!match) return undefined;
  const [, d, m, y] = match;
  const date = new Date(`${y}-${m}-${d}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.getUTCDate() !== Number(d)) return undefined;
  return `${y}-${m}-${d}`;
}

// Inserts the dots as digits are typed: "1205" -> "12.05".
export function maskDateInput(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`;
}

export function cleanPlate(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
}
