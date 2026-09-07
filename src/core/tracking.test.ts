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
  topicCreated,
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
      focusStarted("t1", "2026-09-06T09:00:00Z"),
      focusPaused("2026-09-06T11:30:00Z"),
      entryRevoked("e1"),
      entryRetimed("e1", "2026-09-06T11:00:00Z"),
    ]).toEqual([
      { kind: "topic.created", payload: { topicId: "t1", name: "Login" } },
      { kind: "topic.renamed", payload: { topicId: "t1", name: "Login flow" } },
      { kind: "topic.archived", payload: { topicId: "t1" } },
      { kind: "topic.restored", payload: { topicId: "t1" } },
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
