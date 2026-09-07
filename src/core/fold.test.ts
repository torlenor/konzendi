import { describe, expect, it } from "vitest";
import type { EventRecord } from "./events";
import { foldLog, type Subject, type TrackingState } from "./fold";

// The worked example states times only and notes they are UTC on one day.
const DAY = "2026-09-06";
const at = (time: string) => `${DAY}T${time}Z`;

function record(
  id: string,
  device: string,
  recordedAt: string,
  kind: string,
  payload: unknown,
): EventRecord {
  return { id, device, recordedAt: at(recordedAt), kind, payload };
}

const label = (subject: Subject) =>
  subject.type === "pause" ? "pause" : `topic ${subject.topicId}`;

/** The timeline as the design document writes it, so a test reads like the example. */
const timelineOf = (state: TrackingState) =>
  state.timeline.map(
    (interval) =>
      `${interval.start.slice(11, 19)} - ${interval.end?.slice(11, 19) ?? "open"}  ${label(interval.subject)}`,
  );

const currentOf = (state: TrackingState) =>
  state.current === null
    ? "idle"
    : `${label(state.current.subject)} since ${state.current.start.slice(11, 19)}`;

// Phase 1, "Worked example". Short ids stand in for UUIDs.
const example: EventRecord[] = [
  record("e1", "A", "09:00:00", "topic.created", {
    topicId: "t1",
    name: "Login",
  }),
  record("e2", "A", "09:00:00.5", "focus.started", {
    topicId: "t1",
    effectiveAt: at("09:00:00"),
  }),
  record("e3", "A", "10:30:00", "topic.created", {
    topicId: "t2",
    name: "Email",
  }),
  record("e4", "A", "10:30:01", "focus.started", {
    topicId: "t2",
    effectiveAt: at("10:30:01"),
  }),
  record("e5", "A", "10:30:04", "entry.revoked", { targetId: "e4" }),
  record("e6", "A", "12:00:00", "focus.paused", {
    effectiveAt: at("11:45:00"),
  }),
  record("e7", "B", "13:00:00", "topic.renamed", {
    topicId: "t1",
    name: "Login flow",
  }),
  record("e8", "A", "13:05:00", "focus.started", {
    topicId: "t1",
    effectiveAt: at("13:00:00"),
  }),
  record("e9", "A", "13:06:00", "entry.retimed", {
    targetId: "e6",
    effectiveAt: at("11:30:00"),
  }),
];

const revokesTheRevocation = record("e10", "A", "13:10:00", "entry.revoked", {
  targetId: "e5",
});

const started = (
  id: string,
  recordedAt: string,
  topicId: string,
  effectiveAt = recordedAt,
) =>
  record(id, "A", recordedAt, "focus.started", {
    topicId,
    effectiveAt: at(effectiveAt),
  });

const paused = (id: string, recordedAt: string, effectiveAt = recordedAt) =>
  record(id, "A", recordedAt, "focus.paused", { effectiveAt: at(effectiveAt) });

describe("foldLog", () => {
  it("folds the worked example to the stated timeline and current state", () => {
    const state = foldLog(example);
    expect(state.topics).toEqual([
      { id: "t1", name: "Login flow", archived: false },
      { id: "t2", name: "Email", archived: false },
    ]);
    expect(timelineOf(state)).toEqual([
      "09:00:00 - 11:30:00  topic t1",
      "11:30:00 - 13:00:00  pause",
      "13:00:00 - open  topic t1",
    ]);
    expect(currentOf(state)).toBe("topic t1 since 13:00:00");
  });

  it("restores the revoked switch when the revocation is itself revoked", () => {
    const state = foldLog([...example, revokesTheRevocation]);
    expect(timelineOf(state)).toEqual([
      "09:00:00 - 10:30:01  topic t1",
      "10:30:01 - 11:30:00  topic t2",
      "11:30:00 - 13:00:00  pause",
      "13:00:00 - open  topic t1",
    ]);
    expect(currentOf(state)).toBe("topic t1 since 13:00:00");
  });

  it("drops a repeated selection of the active topic", () => {
    const again = started("e11", "13:00:02", "t1");
    expect(timelineOf(foldLog([...example, again]))).toEqual(
      timelineOf(foldLog(example)),
    );
  });

  it("does not depend on the order the log is presented in", () => {
    const shuffled = [4, 8, 0, 6, 2, 9, 1, 7, 3, 5].map(
      (index) => [...example, revokesTheRevocation][index],
    );
    expect(foldLog(shuffled)).toEqual(
      foldLog([...example, revokesTheRevocation]),
    );
    expect(foldLog(shuffled.slice(0, 5), shuffled.slice(5))).toEqual(
      foldLog([...example, revokesTheRevocation]),
    );
  });

  it("resolves two devices retiming one entry by merge order, on both devices", () => {
    const first = record("r1", "A", "12:10:00", "entry.retimed", {
      targetId: "e6",
      effectiveAt: at("11:00:00"),
    });
    const later = record("r2", "B", "12:20:00", "entry.retimed", {
      targetId: "e6",
      effectiveAt: at("11:15:00"),
    });
    const onA = foldLog([...example, first], [later]);
    const onB = foldLog([later], [...example, first]);
    expect(onA).toEqual(onB);
    // e9 at 13:06 is later still, so the entry keeps the time it set.
    expect(timelineOf(onA)).toEqual(timelineOf(foldLog(example)));
    const withoutE9 = example.filter((event) => event.id !== "e9");
    expect(timelineOf(foldLog([...withoutE9, first], [later]))).toContain(
      "11:15:00 - 13:00:00  pause",
    );
  });

  it("retains a revocation whose target has not been merged yet", () => {
    const revocation = record("x1", "B", "13:20:00", "entry.revoked", {
      targetId: "e8",
    });
    const withoutTarget = example.filter((event) => event.id !== "e8");
    expect(currentOf(foldLog([revocation], [withoutTarget[0]]))).toBe("idle");
    expect(currentOf(foldLog([...example, revocation]))).toBe(
      "pause since 11:30:00",
    );
  });

  it("keeps an interval whose topic is unknown", () => {
    const orphan = started("o1", "14:00:00", "t9");
    const state = foldLog([...example, orphan]);
    expect(state.topics.map((topic) => topic.id)).toEqual(["t1", "t2"]);
    expect(currentOf(state)).toBe("topic t9 since 14:00:00");
  });

  it("omits a zero-length interval but still reads the later entry as current", () => {
    const state = foldLog([
      started("a", "09:00:00", "t1"),
      started("b", "09:30:00", "t2", "09:00:00"),
    ]);
    expect(timelineOf(state)).toEqual(["09:00:00 - open  topic t2"]);
    expect(currentOf(state)).toBe("topic t2 since 09:00:00");
  });

  it("is idle with no tracking events and ignores foreign kinds", () => {
    const state = foldLog([
      record("f1", "A", "08:00:00", "foundation.check", {}),
      record("f2", "A", "08:00:01", "focus.started", { topicId: "t1" }),
      record("f3", "A", "08:00:02", "focus.paused", {
        effectiveAt: "not a time",
      }),
    ]);
    expect(state).toEqual({
      topics: [],
      entries: [],
      timeline: [],
      current: null,
    });
  });

  it("ignores a retime that does not target a tracking event", () => {
    const state = foldLog([
      ...example,
      record("z1", "A", "13:30:00", "entry.retimed", {
        targetId: "e1",
        effectiveAt: at("07:00:00"),
      }),
      record("z2", "A", "13:31:00", "entry.retimed", {
        targetId: "absent",
        effectiveAt: at("07:00:00"),
      }),
    ]);
    expect(timelineOf(state)).toEqual(timelineOf(foldLog(example)));
  });

  it("applies the last effective rename and the archive state", () => {
    const state = foldLog([
      ...example,
      record("a1", "A", "14:00:00", "topic.archived", { topicId: "t2" }),
      record("a2", "A", "14:01:00", "topic.renamed", {
        topicId: "t1",
        name: "Sign-in",
      }),
      record("a3", "A", "14:02:00", "entry.revoked", { targetId: "a2" }),
      record("a4", "A", "14:03:00", "topic.restored", { topicId: "t2" }),
      record("a5", "A", "14:04:00", "topic.archived", { topicId: "t9" }),
    ]);
    expect(state.topics).toEqual([
      { id: "t1", name: "Login flow", archived: false },
      { id: "t2", name: "Email", archived: false },
    ]);
  });

  it("reports revoked entries with the revocations that hide them", () => {
    const twice = [
      ...example,
      record("d1", "B", "13:40:00", "entry.revoked", { targetId: "e8" }),
    ];
    const entry = foldLog(twice).entries.find((item) => item.id === "e8");
    expect(entry).toMatchObject({ revoked: true, revokedBy: ["d1"] });
    const restored = foldLog([
      ...twice,
      record("d2", "A", "13:41:00", "entry.revoked", { targetId: "d1" }),
    ]);
    expect(currentOf(restored)).toBe("topic t1 since 13:00:00");
  });

  it("lists entries in timeline order and marks corrected times", () => {
    const state = foldLog([...example, paused("p1", "13:50:00", "08:00:00")]);
    expect(state.entries.map((entry) => entry.id)).toEqual([
      "p1",
      "e2",
      "e4",
      "e6",
      "e8",
    ]);
    expect(state.entries.map((entry) => entry.retimed)).toEqual([
      false,
      false,
      false,
      true,
      false,
    ]);
  });
});
