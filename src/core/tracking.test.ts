import { describe, expect, it } from "vitest";
import type { EventRecord } from "./events";
import {
  entryRetimed,
  entryRevoked,
  focusPaused,
  focusStarted,
  isTrackingEvent,
  readEvent,
  topicArchived,
  topicColorSet,
  topicCreated,
  topicQuickKeySet,
  topicRenamed,
  topicRestored,
} from "./tracking";

const stored = (kind: string, payload: unknown): EventRecord => ({
  id: "event-1",
  device: "device-a",
  recordedAt: "2026-09-06T10:00:00Z",
  kind,
  payload,
});

describe("event drafts", () => {
  it("carry the payload the design specifies", () => {
    expect([
      topicCreated("t1", "Login"),
      topicRenamed("t1", "Login flow"),
      topicArchived("t1"),
      topicRestored("t1"),
      topicQuickKeySet("t1", 3),
      topicColorSet("t1", "#A1B2C3"),
      focusStarted("t1", "2026-09-06T09:00:00Z"),
      focusPaused("2026-09-06T11:30:00Z"),
      entryRevoked("e1"),
      entryRetimed("e1", "2026-09-06T11:00:00Z"),
    ]).toEqual([
      { kind: "topic.created", payload: { topicId: "t1", name: "Login" } },
      { kind: "topic.renamed", payload: { topicId: "t1", name: "Login flow" } },
      { kind: "topic.archived", payload: { topicId: "t1" } },
      { kind: "topic.restored", payload: { topicId: "t1" } },
      { kind: "topic.quick-key-set", payload: { topicId: "t1", key: 3 } },
      { kind: "topic.color-set", payload: { topicId: "t1", color: "#a1b2c3" } },
      {
        kind: "focus.started",
        payload: { topicId: "t1", effectiveAt: "2026-09-06T09:00:00Z" },
      },
      {
        kind: "focus.paused",
        payload: { effectiveAt: "2026-09-06T11:30:00Z" },
      },
      { kind: "entry.revoked", payload: { targetId: "e1" } },
      {
        kind: "entry.retimed",
        payload: { targetId: "e1", effectiveAt: "2026-09-06T11:00:00Z" },
      },
    ]);
  });

  it("round-trip through the reader", () => {
    for (const draft of [
      topicCreated("t1", "Login"),
      topicQuickKeySet("t1", 9),
      topicQuickKeySet("t1", null),
      topicColorSet("t1", "#00aa11"),
      topicColorSet("t1", null),
      focusStarted("t1", "2026-09-06T09:00:00Z"),
      focusPaused("2026-09-06T11:30:00Z"),
      entryRetimed("e1", "2026-09-06T11:00:00Z"),
    ]) {
      const known = readEvent(stored(draft.kind, draft.payload));
      expect(known).toMatchObject({ kind: draft.kind, payload: draft.payload });
    }
  });
});

describe("readEvent", () => {
  it("ignores a kind this build does not know", () => {
    expect(readEvent(stored("foundation.check", {}))).toBeNull();
    expect(readEvent(stored("focus.resumed", { topicId: "t1" }))).toBeNull();
  });

  it("ignores a payload that does not match its kind", () => {
    expect(readEvent(stored("focus.started", { topicId: "t1" }))).toBeNull();
    expect(
      readEvent(stored("focus.started", { topicId: 7, effectiveAt: "x" })),
    ).toBeNull();
    expect(
      readEvent(stored("focus.paused", { effectiveAt: "half past ten" })),
    ).toBeNull();
    expect(readEvent(stored("topic.created", { topicId: "" }))).toBeNull();
    expect(readEvent(stored("entry.revoked", {}))).toBeNull();
  });

  it("accepts only integer quick keys from 1 to 9 or an explicit null", () => {
    const key = (value: unknown) =>
      readEvent(stored("topic.quick-key-set", { topicId: "t1", key: value }));
    for (const valid of [1, 5, 9, null]) expect(key(valid)).not.toBeNull();
    for (const invalid of [0, 10, -1, 2.5, "3", Number.NaN, undefined, true]) {
      expect(key(invalid)).toBeNull();
    }
    expect(
      readEvent(stored("topic.quick-key-set", { topicId: "t1" })),
    ).toBeNull();
    expect(readEvent(stored("topic.quick-key-set", { key: 1 }))).toBeNull();
  });

  it("accepts only #rrggbb colors in either case or an explicit null", () => {
    const color = (value: unknown) =>
      readEvent(stored("topic.color-set", { topicId: "t1", color: value }));
    for (const valid of ["#a1b2c3", "#A1B2C3", null]) {
      expect(color(valid)).not.toBeNull();
    }
    for (const invalid of [
      "#abc",
      "a1b2c3",
      "red",
      "rgb(1, 2, 3)",
      "#a1b2c3ff",
      "#g1b2c3",
      "",
      " ",
      undefined,
      7,
    ]) {
      expect(color(invalid)).toBeNull();
    }
    expect(readEvent(stored("topic.color-set", { topicId: "t1" }))).toBeNull();
  });

  it("ignores a payload that is not an object", () => {
    for (const payload of [null, "t1", 3, ["t1"], undefined]) {
      expect(readEvent(stored("topic.archived", payload))).toBeNull();
    }
  });

  it("marks only the two kinds that open an interval", () => {
    const kinds = [
      topicCreated("t1", "Login"),
      focusStarted("t1", "2026-09-06T09:00:00Z"),
      focusPaused("2026-09-06T11:30:00Z"),
      entryRevoked("e1"),
    ].map((draft) => {
      const known = readEvent(stored(draft.kind, draft.payload));
      return known !== null && isTrackingEvent(known);
    });
    expect(kinds).toEqual([false, true, true, false]);
  });
});
