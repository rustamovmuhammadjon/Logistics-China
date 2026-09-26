import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  collectEvents,
  dedupeKeyFor,
  parseTrack718Date,
  verifyTrack718Signature,
  type Track718Payload,
} from "./track718.js";

const fixturePath = fileURLToPath(new URL("./__fixtures__/track718-webhook-sample.json", import.meta.url));
const sample = JSON.parse(readFileSync(fixturePath, "utf8")) as Track718Payload;

describe("verifyTrack718Signature", () => {
  it("matches the confirmed docs test vector", () => {
    // sha256_hex("support@track718.com" + "1584620126673")
    //   === "99b615fa1692b7e15369b88a03c0eda3668d891c701bbe75caba2c74046bb3c6"
    const ok = verifyTrack718Signature(
      { timestamp: 1584620126673, sign: "99b615fa1692b7e15369b88a03c0eda3668d891c701bbe75caba2c74046bb3c6" },
      "support@track718.com"
    );
    expect(ok).toBe(true);
  });

  it("rejects a wrong signature", () => {
    const ok = verifyTrack718Signature({ timestamp: 1584620126673, sign: "0".repeat(64) }, "support@track718.com");
    expect(ok).toBe(false);
  });

  it("rejects when the account email is not configured", () => {
    const ok = verifyTrack718Signature(
      { timestamp: 1584620126673, sign: "99b615fa1692b7e15369b88a03c0eda3668d891c701bbe75caba2c74046bb3c6" },
      ""
    );
    expect(ok).toBe(false);
  });

  it("rejects a missing verify block", () => {
    expect(verifyTrack718Signature(undefined, "support@track718.com")).toBe(false);
  });
});

describe("parseTrack718Date", () => {
  it("converts a +08:00 timestamp to UTC", () => {
    const date = parseTrack718Date("2021-03-15 19:54:08", "+08:00");
    // 19:54:08 at +08:00 is 11:54:08 UTC the same day.
    expect(date.toISOString()).toBe("2021-03-15T11:54:08.000Z");
  });

  it("falls back to the default zone when none is given", () => {
    const withDefault = parseTrack718Date("2021-03-15 19:54:08", undefined);
    const explicit = parseTrack718Date("2021-03-15 19:54:08", "+08:00");
    expect(withDefault.toISOString()).toBe(explicit.toISOString());
  });

  it("handles a negative offset", () => {
    const date = parseTrack718Date("2021-03-23 14:57:08", "-04:00");
    expect(date.toISOString()).toBe("2021-03-23T18:57:08.000Z");
  });
});

describe("dedupeKeyFor", () => {
  it("is stable for the same inputs", () => {
    const a = dedupeKeyFor("SL-1", "2021-03-15 19:54:08", "YIWU", "YIWU");
    const b = dedupeKeyFor("SL-1", "2021-03-15 19:54:08", "YIWU", "YIWU");
    expect(a).toBe(b);
  });

  it("differs when any field differs", () => {
    const a = dedupeKeyFor("SL-1", "2021-03-15 19:54:08", "YIWU", "YIWU");
    const b = dedupeKeyFor("SL-2", "2021-03-15 19:54:08", "YIWU", "YIWU");
    expect(a).not.toBe(b);
  });
});

describe("collectEvents", () => {
  it("dedupes the fixture's overlapping fromDetail/latest/online/sign events", () => {
    const item = sample.list[0];
    const events = collectEvents(item);
    // 6 fromDetail entries, all distinct from each other. "latest" and
    // "sign" share the same date/status/address as each other (both
    // "HALLAM VIC, DELIVERED WITH SAFE DROP") but NOT the same status/
    // address text as fromDetail[0] (which reads "HALLAM, VIC, 01040,
    // DELIVERED WITH SAFE DROP" / "HALLAM, VIC, 01040") despite sharing its
    // timestamp -- so together they contribute exactly one more distinct
    // event. "online" exactly matches fromDetail[4] and contributes
    // nothing new. Total: 6 + 1 = 7.
    expect(events).toHaveLength(7);
  });

  it("parses empty coordinate strings as null, not NaN", () => {
    const item = sample.list[0];
    const events = collectEvents(item);
    const hallam = events.find((e) => e.address === "HALLAM, VIC, 01040");
    expect(hallam?.lat).toBeNull();
    expect(hallam?.lng).toBeNull();
    expect(hallam?.coordSource).toBeNull();
  });

  it("returns an empty list for an item with no detail/latest/online", () => {
    expect(collectEvents({ trackNum: "X" })).toEqual([]);
  });
});
