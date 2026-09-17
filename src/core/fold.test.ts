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

/** A topic with no archive, key, or color. */
const plain = { archived: false, quickKey: null, color: null };

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
      { id: "t1", name: "Login flow", ...plain },
      { id: "t2", name: "Email", ...plain },
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

  it("registers a topic that has no tracking entry and stays idle", () => {
    const state = foldLog([
      record("p1", "A", "08:00:00", "topic.created", {
        topicId: "t1",
        name: "Prepared",
      }),
    ]);
    expect(state).toEqual({
      topics: [{ id: "t1", name: "Prepared", ...plain }],
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
      { id: "t1", name: "Login flow", ...plain },
      { id: "t2", name: "Email", ...plain },
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

describe("foldLog: quick keys and colors", () => {
  const created = (id: string, recordedAt: string, topicId: string) =>
    record(id, "A", recordedAt, "topic.created", { topicId, name: topicId });
  const keySet = (
    id: string,
    recordedAt: string,
    topicId: string,
    key: unknown,
    device = "A",
  ) => record(id, device, recordedAt, "topic.quick-key-set", { topicId, key });
  const colorSet = (
    id: string,
    recordedAt: string,
    topicId: string,
    color: unknown,
  ) => record(id, "A", recordedAt, "topic.color-set", { topicId, color });
  const archived = (id: string, recordedAt: string, topicId: string) =>
    record(id, "A", recordedAt, "topic.archived", { topicId });
  const restored = (id: string, recordedAt: string, topicId: string) =>
    record(id, "A", recordedAt, "topic.restored", { topicId });
  const revoked = (id: string, recordedAt: string, targetId: string) =>
    record(id, "A", recordedAt, "entry.revoked", { targetId });

  const base = [
    created("c1", "08:00:00", "a"),
    created("c2", "08:00:01", "b"),
    created("c3", "08:00:02", "c"),
    created("c4", "08:00:03", "d"),
  ];
  const keys = (state: TrackingState) =>
    Object.fromEntries(state.topics.map((topic) => [topic.id, topic.quickKey]));
  const colors = (state: TrackingState) =>
    Object.fromEntries(state.topics.map((topic) => [topic.id, topic.color]));

  it("folds an old log with no keys and no colors", () => {
    for (const topic of foldLog(example).topics) {
      expect(topic).toMatchObject({ quickKey: null, color: null });
    }
  });

  it("assigns sparse keys without filling the gaps", () => {
    const state = foldLog([
      ...base,
      keySet("k1", "09:00:00", "a", 1),
      keySet("k2", "09:00:01", "b", 3),
      keySet("k3", "09:00:02", "c", 9),
    ]);
    expect(keys(state)).toEqual({ a: 1, b: 3, c: 9, d: null });
  });

  it("ignores invalid key payloads", () => {
    const state = foldLog([
      ...base,
      keySet("k1", "09:00:00", "a", 0),
      keySet("k2", "09:00:01", "a", 10),
      keySet("k3", "09:00:02", "a", "3"),
      keySet("k4", "09:00:03", "a", 2.5),
      record("k5", "A", "09:00:04", "topic.quick-key-set", { topicId: "a" }),
      keySet("k6", "09:00:05", "a", Number.NaN),
    ]);
    expect(keys(state).a).toBeNull();
  });

  it("ignores assignments to unknown and archived topics", () => {
    const state = foldLog([
      ...base,
      keySet("k1", "09:00:00", "zz", 4),
      archived("x1", "09:00:01", "a"),
      keySet("k2", "09:00:02", "a", 5),
      colorSet("p1", "09:00:03", "a", "#112233"),
      colorSet("p2", "09:00:04", "zz", "#112233"),
    ]);
    expect(state.topics.map((topic) => topic.id)).toEqual(["a", "b", "c", "d"]);
    expect(keys(state)).toEqual({ a: null, b: null, c: null, d: null });
    expect(colors(state).a).toBeNull();
  });

  it("moves a key in one event and frees the new owner's old key", () => {
    const state = foldLog([
      ...base,
      keySet("k1", "09:00:00", "b", 3),
      keySet("k2", "09:00:01", "d", 7),
      keySet("k3", "09:00:02", "d", 3),
    ]);
    expect(keys(state)).toEqual({ a: null, b: null, c: null, d: 3 });
  });

  it("clears only the target, and nothing takes the cleared key", () => {
    const state = foldLog([
      ...base,
      keySet("k1", "09:00:00", "a", 1),
      keySet("k2", "09:00:01", "b", 2),
      keySet("k3", "09:00:02", "b", null),
    ]);
    expect(keys(state)).toEqual({ a: 1, b: null, c: null, d: null });
  });

  it("clears the key on archive and does not recover it on restore", () => {
    const log = [
      ...base,
      keySet("k1", "09:00:00", "a", 1),
      keySet("k2", "09:00:01", "b", 3),
      colorSet("p1", "09:00:02", "a", "#AABBCC"),
      archived("x1", "09:00:03", "a"),
    ];
    expect(keys(foldLog(log))).toEqual({ a: null, b: 3, c: null, d: null });
    const back = foldLog([...log, restored("x2", "09:00:04", "a")]);
    expect(keys(back)).toEqual({ a: null, b: 3, c: null, d: null });
    expect(back.topics[0]).toMatchObject({ archived: false, color: "#aabbcc" });
  });

  it("lets the last effective assignment win, and a revoked winner revives no loser", () => {
    const log = [
      ...base,
      keySet("k1", "09:00:00", "a", 4),
      keySet("k2", "09:00:01", "b", 4, "B"),
    ];
    expect(keys(foldLog(log))).toMatchObject({ a: null, b: 4 });
    // Revoking the winner removes its assignment; the displaced topic stays displaced
    // only while the displacement is effective, because each fold starts from the log.
    const revokedWinner = foldLog([...log, revoked("r1", "09:00:02", "k2")]);
    expect(keys(revokedWinner)).toMatchObject({ a: 4, b: null });
    // Clearing the winner with a null event does not revive the loser.
    const clearedWinner = foldLog([
      ...log,
      keySet("k3", "09:00:03", "b", null),
    ]);
    expect(keys(clearedWinner)).toMatchObject({ a: null, b: null });
  });

  it("breaks equal timestamps by event id, whatever the device or log order", () => {
    const one = keySet("k-1", "09:00:00", "a", 6, "A");
    const two = keySet("k-2", "09:00:00", "b", 6, "B");
    const onA = foldLog([...base, one], [two]);
    const onB = foldLog([two], [one, ...base]);
    expect(onA).toEqual(onB);
    expect(keys(onA)).toMatchObject({ a: null, b: 6 });
  });

  it("is unchanged by duplicate broadcasts and permuted logs", () => {
    const log = [
      ...base,
      keySet("k1", "09:00:00", "a", 1),
      keySet("k2", "09:00:01", "b", 1),
      colorSet("p1", "09:00:02", "c", "#00ff00"),
      archived("x1", "09:00:03", "b"),
      restored("x2", "09:00:04", "b"),
      keySet("k3", "09:00:05", "b", 2),
      revoked("r1", "09:00:06", "k1"),
    ];
    const expected = foldLog(log);
    expect(keys(expected)).toEqual({ a: null, b: 2, c: null, d: null });
    const permuted = [8, 2, 10, 0, 5, 7, 1, 9, 3, 6, 4].map((i) => log[i]);
    expect(foldLog(permuted)).toEqual(expected);
    expect(foldLog(permuted, log, [log[4], log[9]])).toEqual(expected);
  });

  it("stores colors in lower case, shares them, and ignores invalid forms", () => {
    const state = foldLog([
      ...base,
      colorSet("p1", "09:00:00", "a", "#A1B2C3"),
      colorSet("p2", "09:00:01", "b", "#a1b2c3"),
      colorSet("p3", "09:00:02", "c", "#abc"),
      colorSet("p4", "09:00:03", "c", "red"),
      colorSet("p5", "09:00:04", "c", "rgb(1, 2, 3)"),
      colorSet("p6", "09:00:05", "c", "#a1b2c3ff"),
      colorSet("p7", "09:00:06", "c", ""),
      record("p8", "A", "09:00:07", "topic.color-set", { topicId: "c" }),
      colorSet("p9", "09:00:08", "d", "#123456"),
      colorSet("p10", "09:00:09", "d", null),
    ]);
    expect(colors(state)).toEqual({
      a: "#a1b2c3",
      b: "#a1b2c3",
      c: null,
      d: null,
    });
  });

  it("keeps keys through switches, stops, renames, and new topics", () => {
    const log = [
      ...base,
      keySet("k1", "09:00:00", "a", 1),
      keySet("k2", "09:00:01", "b", 3),
      keySet("k3", "09:00:02", "c", 9),
    ];
    const later = [
      started("s1", "10:00:00", "b"),
      paused("s2", "10:30:00"),
      started("s3", "11:00:00", "a"),
      record("n1", "A", "11:10:00", "topic.renamed", {
        topicId: "c",
        name: "renamed",
      }),
      created("c5", "11:20:00", "e"),
    ];
    expect(keys(foldLog([...log, ...later]))).toEqual({
      a: 1,
      b: 3,
      c: 9,
      d: null,
      e: null,
    });
  });

  it("leaves entries, intervals, and the current state unchanged", () => {
    const plainState = foldLog(example);
    const withMetadata = foldLog([
      ...example,
      keySet("k1", "11:00:00", "t1", 2),
      colorSet("p1", "11:00:01", "t2", "#336699"),
      keySet("k2", "13:10:00", "t2", 2),
    ]);
    expect(withMetadata.entries).toEqual(plainState.entries);
    expect(withMetadata.timeline).toEqual(plainState.timeline);
    expect(withMetadata.current).toEqual(plainState.current);
    expect(keys(withMetadata)).toEqual({ t1: null, t2: 2 });
  });
});
