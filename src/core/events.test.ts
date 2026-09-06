import { describe, expect, it } from "vitest";
import { type EventRecord, mergeEvents } from "./events";

const event = (
  id: string,
  recordedAt: string,
  device = "device-a",
): EventRecord => ({
  id,
  recordedAt,
  device,
  kind: "foundation.check",
  payload: {},
});

describe("mergeEvents", () => {
  it("preserves Rust sub-millisecond timestamp order", () => {
    const first = event("z", "2026-09-06T10:00:00.123001Z");
    const second = event("a", "2026-09-06T10:00:00.123002Z");
    expect(mergeEvents([second, first])).toEqual([first, second]);
  });
  it("handles empty logs", () => expect(mergeEvents([], [])).toEqual([]));
  it("merges devices chronologically without changing inputs", () => {
    const older = event("a", "2026-09-06T10:00:00Z");
    const newer = event("b", "2026-09-06T12:00:00+01:00", "device-b");
    const input = Object.freeze([newer, older]);
    expect(mergeEvents(input, [older])).toEqual([older, newer]);
    expect(input).toEqual([newer, older]);
  });
  it("deduplicates by id and keeps the first occurrence", () => {
    const first = event("a", "2026-09-06T10:00:00Z");
    expect(
      mergeEvents([first], [{ ...first, payload: { changed: true } }]),
    ).toEqual([first]);
  });
  it("orders equal timestamps deterministically by id", () => {
    const a = event("a", "2026-09-06T10:00:00Z");
    const b = event("b", a.recordedAt);
    expect(mergeEvents([b], [a])).toEqual([a, b]);
  });
});
