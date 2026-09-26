import { createHash, timingSafeEqual } from "node:crypto";
import { prisma } from "./prisma.js";

const DEFAULT_TZ = process.env.TRACK718_DEFAULT_TZ || "+08:00";

/** Constant-time string compare — for the webhook path token and, below,
 * the signature. A plain `===` would leak timing information about how
 * many leading characters matched. */
export function constantTimeEquals(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

/** sign = sha256_hex(ACCOUNT_EMAIL + timestamp). The docs call this
 * optional and admit it's weak (an email isn't a secret) — the URL path
 * token is the real gate; this is a second, independent check. */
export function verifyTrack718Signature(
  verify: { timestamp?: number; sign?: string } | undefined,
  accountEmail: string
): boolean {
  if (!verify || !accountEmail || typeof verify.timestamp !== "number" || !verify.sign) return false;
  const expected = createHash("sha256")
    .update(accountEmail + String(verify.timestamp))
    .digest("hex");
  return constantTimeEquals(expected, verify.sign);
}

export type Track718RawEvent = {
  date: string;
  status?: string;
  address?: string;
  addressInfo?: {
    city?: string;
    country?: string;
    coordinates?: { longitude?: string; latitude?: string };
  };
};

export type Track718WebhookItem = {
  trackNum: string;
  innerNum?: string;
  logisTimeZone?: string;
  fromDetail?: Track718RawEvent[];
  toDetail?: Track718RawEvent[];
  latest?: Track718RawEvent | null;
  online?: Track718RawEvent | null;
  // NOTE: an event (a delivery-signing scan), not the payload's signature —
  // that's the top-level verify.sign. Never confuse the two.
  sign?: Track718RawEvent | null;
};

export type Track718Payload = {
  list: Track718WebhookItem[];
  status?: { code: number; msg: string };
  verify: { timestamp: number; sign: string };
};

/** "YYYY-MM-DD HH:mm:ss" (no offset of its own) interpreted in `zone`
 * ("+08:00" style), converted to UTC. Isolated on its own per the spec —
 * unverified against a real Starlink Box push yet, so this is the one
 * function to revisit if timestamps come out wrong. */
export function parseTrack718Date(raw: string, zone: string | undefined): Date {
  const tz = zone || DEFAULT_TZ;
  const match = /^([+-])(\d{2}):?(\d{2})$/.exec(tz);
  const offsetMinutes = match
    ? (match[1] === "-" ? -1 : 1) * (Number(match[2]) * 60 + Number(match[3]))
    : 8 * 60;
  const asIfUtc = new Date(raw.replace(" ", "T") + "Z");
  return new Date(asIfUtc.getTime() - offsetMinutes * 60_000);
}

function parseCoordinate(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function dedupeKeyFor(trackNum: string, date: string, status: string, address: string): string {
  return createHash("sha256").update(`${trackNum}|${date}|${status}|${address}`).digest("hex");
}

export type NormalizedTrack718Event = {
  trackNum: string;
  occurredAt: Date;
  rawDate: string;
  statusText: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
  coordSource: string | null;
  dedupeKey: string;
};

function normalizeEvent(trackNum: string, zone: string | undefined, event: Track718RawEvent): NormalizedTrack718Event {
  const status = event.status ?? "";
  const address = event.address ?? "";
  const lat = parseCoordinate(event.addressInfo?.coordinates?.latitude);
  const lng = parseCoordinate(event.addressInfo?.coordinates?.longitude);
  return {
    trackNum,
    occurredAt: parseTrack718Date(event.date, zone),
    rawDate: event.date,
    statusText: status || null,
    address: address || null,
    city: event.addressInfo?.city || null,
    country: event.addressInfo?.country || null,
    lat,
    lng,
    coordSource: lat !== null && lng !== null ? "gps" : null,
    dedupeKey: dedupeKeyFor(trackNum, event.date, status, address),
  };
}

/** fromDetail + toDetail + latest + online + sign (a delivery-signing
 * event, per the docs — NOT the payload's signature, that's the top-level
 * verify.sign), deduped by dedupeKey since the same underlying event
 * commonly appears in more than one of these fields. */
export function collectEvents(item: Track718WebhookItem): NormalizedTrack718Event[] {
  const raw = [...(item.fromDetail ?? []), ...(item.toDetail ?? []), item.latest, item.online, item.sign].filter(
    (e): e is Track718RawEvent => Boolean(e)
  );
  const byKey = new Map<string, NormalizedTrack718Event>();
  for (const event of raw) {
    const normalized = normalizeEvent(item.trackNum, item.logisTimeZone, event);
    byKey.set(normalized.dedupeKey, normalized);
  }
  return [...byKey.values()];
}

function isUniqueConstraintError(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002";
}

/** Matches each item to a Track718Tracking by trackNum (among
 * pending/active trackings only — innerNum isn't used yet since nothing
 * sets it until Phase 3's subscribe call exists), inserts its events
 * (silently skipping ones we've already stored — a replay must change
 * nothing), and refreshes the tracking's last-known address/coordinates
 * when a newer event came in. An unmatched number's events are still
 * stored, just with trackingId = null. */
export async function processTrack718Payload(payload: Track718Payload) {
  for (const item of payload.list ?? []) {
    const events = collectEvents(item);
    if (events.length === 0) continue;

    const tracking = await prisma.track718Tracking.findFirst({
      where: { trackingNumber: item.trackNum, status: { in: ["PENDING", "ACTIVE"] } },
    });

    for (const event of events) {
      try {
        await prisma.track718Event.create({
          data: { ...event, trackingId: tracking?.id ?? null },
        });
      } catch (err) {
        if (!isUniqueConstraintError(err)) throw err;
      }
    }

    if (tracking) {
      const latest = events.reduce((a, b) => (b.occurredAt > a.occurredAt ? b : a));
      const isNewer = !tracking.lastEventAt || latest.occurredAt > tracking.lastEventAt;
      await prisma.track718Tracking.update({
        where: { id: tracking.id },
        data: {
          status: "ACTIVE",
          ...(isNewer
            ? {
                lastAddress: latest.address ?? tracking.lastAddress,
                lastLat: latest.lat ?? tracking.lastLat,
                lastLng: latest.lng ?? tracking.lastLng,
                lastEventAt: latest.occurredAt,
              }
            : {}),
        },
      });
    }
  }
}
