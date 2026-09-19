import { describe, expect, it } from "vitest";
import { sliceDay } from "./day";
import type { EventRecord } from "./events";
import { foldLog } from "./fold";
import { QUALIFYING_SESSION_MS, sliceWeek } from "./week";

// Instants are written in UTC and the week bounds are passed in explicitly, so these
// tests say the same thing on a machine in any timezone. The week of 14 September 2026
// starts on Monday, 14 September, and ends on Monday, 21 September.
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const WEEK = { start: "2026-09-14T00:00:00Z", end: "2026-09-21T00:00:00Z" };
const EARLIER = { start: "2026-09-07T00:00:00Z", end: "2026-09-14T00:00:00Z" };

let sequence = 0;
function record(
  kind: string,
  payload: unknown,
  recordedAt: string,
): EventRecord {
  sequence += 1;
  return { id: `e${sequence}`, device: "A", recordedAt, kind, payload };
}
const created = (topicId: string, name: string, at: string) =>
  record("topic.created", { topicId, name }, at);
const started = (topicId: string, at: string) =>
  record("focus.started", { topicId, effectiveAt: at }, at);
const paused = (at: string) => record("focus.paused", { effectiveAt: at }, at);
const retimed = (targetId: string, effectiveAt: string, at: string) =>
  record("entry.retimed", { targetId, effectiveAt }, at);

const topics = [
  created("t1", "Complex topic", "2026-09-14T06:00:00Z"),
  created("t2", "Other work", "2026-09-14T06:00:01Z"),
];

/** The clock late on Friday, so a fixture that does not run is complete. */
const NOW = Date.parse("2026-09-18T20:00:00Z");

const week = (
  log: EventRecord[],
  bounds: { start: string; end: string } = WEEK,
  now: number = NOW,
) => sliceWeek(foldLog(log), bounds.start, bounds.end, now);

const topicOf = (log: EventRecord[], topicId: string) => {
  const found = week(log).topics.find(
    (entry) =>
      entry.subject.type === "topic" && entry.subject.topicId === topicId,
  );
  if (!found) throw new Error(`No reading for ${topicId}`);
  return found;
};

describe("session boundaries", () => {
  it("keeps one session across a stop of exactly 15 minutes", () => {
    const log = [
      ...topics,
      started("t1", "2026-09-14T09:00:00Z"),
      paused("2026-09-14T11:00:00Z"),
      started("t1", "2026-09-14T11:15:00Z"),
      paused("2026-09-14T13:00:00Z"),
    ];
    const { sessions } = week(log);
    expect(sessions).toHaveLength(1);
    const [session] = sessions;
    expect(session.start).toBe("2026-09-14T09:00:00Z");
    expect(session.end).toBe("2026-09-14T13:00:00Z");
    // Two hours, a stop of 15 minutes, and one hour 45 minutes: the accepted example.
    expect(session.elapsedMs).toBe(4 * HOUR);
    expect(session.recordedMs).toBe(3 * HOUR + 45 * MINUTE);
    expect(session.stopMs).toBe(15 * MINUTE);
    expect(session.stops).toBe(1);
    expect(session.qualifies).toBe(true);
  });

  it("separates two sessions at a stop of 15 minutes and one millisecond", () => {
    const log = [
      ...topics,
      started("t1", "2026-09-14T09:00:00Z"),
      paused("2026-09-14T11:00:00Z"),
      started("t1", "2026-09-14T11:15:00.001Z"),
      paused("2026-09-14T13:00:00Z"),
    ];
    const { sessions } = week(log);
    expect(sessions.map((session) => session.elapsedMs)).toEqual([
      2 * HOUR,
      HOUR + 45 * MINUTE - 1,
    ]);
    expect(sessions.every((session) => session.qualifies)).toBe(false);
    expect(topicOf(log, "t1").qualifying).toBe(0);
    // The recorded time of the topic is the same as the day view reads it.
    expect(topicOf(log, "t1").recordedMs).toBe(3 * HOUR + 45 * MINUTE - 1);
  });

  it("ends a session at a switch, even when the topic returns at once", () => {
    const log = [
      ...topics,
      started("t1", "2026-09-14T09:00:00Z"),
      started("t2", "2026-09-14T11:00:00Z"),
      started("t1", "2026-09-14T11:01:00Z"),
      paused("2026-09-14T13:00:00Z"),
    ];
    const { sessions } = week(log);
    expect(sessions).toHaveLength(3);
    expect(sessions.map((session) => session.elapsedMs)).toEqual([
      2 * HOUR,
      MINUTE,
      HOUR + 59 * MINUTE,
    ]);
    expect(topicOf(log, "t1").longestMs).toBe(2 * HOUR);
  });

  it("does not join two stretches of different topics across a short stop", () => {
    const log = [
      ...topics,
      started("t1", "2026-09-14T09:00:00Z"),
      paused("2026-09-14T11:00:00Z"),
      started("t2", "2026-09-14T11:05:00Z"),
      paused("2026-09-14T12:00:00Z"),
    ];
    const { sessions } = week(log);
    expect(sessions).toHaveLength(2);
    expect(sessions.every((session) => session.stops === 0)).toBe(true);
  });
});

describe("week bounds", () => {
  it("keeps a session that continues past midnight whole, in its start day", () => {
    const log = [
      ...topics,
      started("t1", "2026-09-16T22:00:00Z"),
      paused("2026-09-17T01:30:00Z"),
    ];
    const { sessions } = week(log);
    expect(sessions).toHaveLength(1);
    expect(sessions[0].elapsedMs).toBe(3 * HOUR + 30 * MINUTE);
    expect(sessions[0].start).toBe("2026-09-16T22:00:00Z");
    expect(sessions[0].end).toBe("2026-09-17T01:30:00Z");
  });

  it("holds a session that starts on Sunday in the earlier week only", () => {
    const log = [
      ...topics,
      started("t1", "2026-09-13T22:00:00Z"),
      paused("2026-09-14T02:00:00Z"),
      started("t2", "2026-09-14T09:00:00Z"),
      paused("2026-09-14T10:00:00Z"),
    ];
    const earlier = week(log, EARLIER);
    expect(earlier.sessions).toHaveLength(1);
    // The full elapsed length stays in the week that holds the start.
    expect(earlier.sessions[0].elapsedMs).toBe(4 * HOUR);
    expect(earlier.sessions[0].qualifies).toBe(true);
    expect(earlier.topics[0].qualifying).toBe(1);

    const later = week(log);
    expect(later.sessions).toHaveLength(1);
    expect(
      later.sessions.some((session) => session.start.startsWith("2026-09-13")),
    ).toBe(false);
  });
});

describe("the running session and the open stop", () => {
  it("counts a running session as soon as it reaches four hours", () => {
    const log = [...topics, started("t1", "2026-09-18T09:00:00Z")];
    const before = week(log, WEEK, Date.parse("2026-09-18T12:59:00Z"));
    expect(before.sessions[0].running).toBe(true);
    expect(before.sessions[0].qualifies).toBe(false);

    const after = week(log, WEEK, Date.parse("2026-09-18T13:00:00Z"));
    expect(after.sessions[0].elapsedMs).toBe(QUALIFYING_SESSION_MS);
    expect(after.sessions[0].qualifies).toBe(true);
    expect(after.topics[0].qualifying).toBe(1);
  });

  it("freezes the session at an open stop, which cannot make it reach four hours", () => {
    const log = [
      ...topics,
      started("t1", "2026-09-18T09:00:00Z"),
      paused("2026-09-18T12:50:00Z"),
    ];
    // The stop is ten minutes old, so the same topic can still join this session.
    const onBreak = week(log, WEEK, Date.parse("2026-09-18T13:00:00Z"));
    expect(onBreak.sessions[0].onBreak).toBe(true);
    expect(onBreak.sessions[0].running).toBe(false);
    expect(onBreak.sessions[0].elapsedMs).toBe(3 * HOUR + 50 * MINUTE);
    expect(onBreak.sessions[0].qualifies).toBe(false);

    // After 15 minutes the stop can join nothing, and the label goes away.
    const ended = week(log, WEEK, Date.parse("2026-09-18T13:06:00Z"));
    expect(ended.sessions[0].onBreak).toBe(false);
    expect(ended.sessions[0].elapsedMs).toBe(3 * HOUR + 50 * MINUTE);
  });
});

describe("readings", () => {
  it("marks a session that holds a stretch longer than 12 hours", () => {
    const log = [
      ...topics,
      started("t1", "2026-09-14T08:00:00Z"),
      paused("2026-09-14T20:00:00Z"),
      started("t2", "2026-09-15T08:00:00Z"),
      paused("2026-09-15T21:15:00Z"),
    ];
    const marked = week(log);
    expect(marked.hasPossiblyForgotten).toBe(true);
    // Exactly 12 hours is not flagged; 13 hours 15 minutes is.
    expect(marked.sessions.map((session) => session.possiblyForgotten)).toEqual(
      [false, true],
    );
    // Both stay in the readings and in the count.
    expect(topicOf(log, "t1").qualifying).toBe(1);
    expect(topicOf(log, "t1").qualifyingPossiblyForgotten).toBe(false);
    expect(topicOf(log, "t2").qualifying).toBe(1);
    expect(topicOf(log, "t2").qualifyingPossiblyForgotten).toBe(true);
  });

  it("gives the recorded time, the longest session, and the count for each topic", () => {
    const log = [
      ...topics,
      started("t1", "2026-09-14T09:00:00Z"),
      paused("2026-09-14T11:00:00Z"),
      started("t1", "2026-09-14T11:10:00Z"),
      paused("2026-09-14T13:10:00Z"),
      started("t2", "2026-09-15T09:00:00Z"),
      paused("2026-09-15T09:30:00Z"),
      started("t1", "2026-09-16T09:00:00Z"),
      paused("2026-09-16T10:00:00Z"),
    ];
    const one = topicOf(log, "t1");
    expect(one.sessions).toHaveLength(2);
    expect(one.recordedMs).toBe(5 * HOUR);
    expect(one.longestMs).toBe(4 * HOUR + 10 * MINUTE);
    expect(one.qualifying).toBe(1);

    const two = topicOf(log, "t2");
    expect(two.recordedMs).toBe(30 * MINUTE);
    expect(two.longestMs).toBe(30 * MINUTE);
    expect(two.qualifying).toBe(0);
  });

  it("orders topics by the registry and leaves out the topics without a session", () => {
    const log = [
      ...topics,
      created("t3", "Review", "2026-09-14T06:00:02Z"),
      started("t3", "2026-09-14T09:00:00Z"),
      started("t1", "2026-09-14T10:00:00Z"),
      paused("2026-09-14T11:00:00Z"),
    ];
    expect(
      week(log).topics.map((entry) =>
        entry.subject.type === "topic" ? entry.subject.topicId : "stop",
      ),
    ).toEqual(["t1", "t3"]);
  });

  it("gives an empty week no session and no topic", () => {
    const empty = week(topics, EARLIER);
    expect(empty.sessions).toEqual([]);
    expect(empty.topics).toEqual([]);
    expect(empty.hasPossiblyForgotten).toBe(false);
  });
});

describe("corrections", () => {
  it("recomputes the count of an earlier week from the corrected log", () => {
    const start = started("t1", "2026-09-07T09:00:00Z");
    const log = [...topics, start, paused("2026-09-07T12:30:00Z")];
    expect(week(log, EARLIER).topics[0].qualifying).toBe(0);
    expect(week(log, EARLIER).sessions[0].elapsedMs).toBe(
      3 * HOUR + 30 * MINUTE,
    );

    const corrected = [
      ...log,
      retimed(start.id, "2026-09-07T08:00:00Z", "2026-09-07T12:31:00Z"),
    ];
    expect(week(corrected, EARLIER).topics[0].qualifying).toBe(1);
    expect(week(corrected, EARLIER).sessions[0].elapsedMs).toBe(
      4 * HOUR + 30 * MINUTE,
    );
  });
});

describe("agreement with the day view", () => {
  // Recorded time is the same quantity in both views, so the sum of the seven days must
  // equal the sum of the topics of the week whenever no session crosses a week boundary.
  it("sums to the same recorded time as the seven days of the week", () => {
    const log = [
      ...topics,
      started("t1", "2026-09-14T09:00:00Z"),
      paused("2026-09-14T11:00:00Z"),
      started("t1", "2026-09-14T11:10:00Z"),
      paused("2026-09-14T13:10:00Z"),
      started("t2", "2026-09-15T09:00:00Z"),
      paused("2026-09-15T09:30:00Z"),
      started("t1", "2026-09-16T22:00:00Z"),
      paused("2026-09-17T01:30:00Z"),
      started("t2", "2026-09-18T08:00:00Z"),
      paused("2026-09-18T12:00:00Z"),
    ];
    const state = foldLog(log);
    let days = 0;
    for (let day = 0; day < 7; day += 1) {
      const from = Date.parse(WEEK.start) + day * 24 * HOUR;
      days += sliceDay(
        state,
        new Date(from).toISOString(),
        new Date(from + 24 * HOUR).toISOString(),
        NOW,
      ).readings.trackedMs;
    }
    const { topics: readings } = week(log);
    const weekly = readings.reduce(
      (total, entry) => total + entry.recordedMs,
      0,
    );
    expect(weekly).toBe(days);
    // The stop inside the joined session is in neither sum.
    expect(weekly).toBe(12 * HOUR);
  });
});
