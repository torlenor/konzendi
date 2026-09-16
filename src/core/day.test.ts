import { describe, expect, it } from "vitest";
import { sliceDay } from "./day";
import type { EventRecord } from "./events";
import { foldLog, type Subject } from "./fold";

// Instants are written in UTC and the day bounds are passed in explicitly, so these
// tests say the same thing on a machine in any timezone.
const HOUR = 60 * 60 * 1000;
const nextDay = (date: string) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + 24 * HOUR)
    .toISOString()
    .slice(0, 10);
const bounds = (date: string) => ({
  start: `${date}T00:00:00Z`,
  end: `${nextDay(date)}T00:00:00Z`,
});

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

const label = (subject: Subject) =>
  subject.type === "pause" ? "stop" : subject.topicId;

/** A day of work that begins the evening before and is still running at `now`. */
const spanning = [
  created("t1", "Login flow", "2026-09-07T21:59:00Z"),
  started("t1", "2026-09-07T22:00:00Z"),
  created("t2", "Email", "2026-09-08T00:59:00Z"),
  started("t2", "2026-09-08T01:00:00Z"),
  paused("2026-09-08T02:00:00Z"),
  started("t1", "2026-09-08T02:30:00Z"),
];
const NOW = Date.parse("2026-09-08T04:00:00Z");

const slice = (log: EventRecord[], date: string, now: number = NOW) => {
  const { start, end } = bounds(date);
  return sliceDay(foldLog(log), start, end, now);
};

describe("day bounds", () => {
  it("puts an interval crossing midnight in both days, clipped and marked", () => {
    const before = slice(spanning, "2026-09-07").lanes[0].segments[0];
    expect([before.start, before.end]).toEqual([
      "2026-09-07T22:00:00Z",
      "2026-09-08T00:00:00.000Z",
    ]);
    expect([before.fromEarlier, before.intoLater]).toEqual([false, true]);

    const after = slice(spanning, "2026-09-08").lanes[0].segments[0];
    expect([after.start, after.end]).toEqual([
      "2026-09-08T00:00:00.000Z",
      "2026-09-08T01:00:00Z",
    ]);
    expect([after.fromEarlier, after.intoLater]).toEqual([true, false]);
    expect(after.ms).toBe(HOUR);
  });

  it("fills a day with an interval that covers the whole of it", () => {
    // Four days on one topic, because nothing ended it until the switch on the ninth.
    const log = [
      created("t1", "Login flow", "2026-09-05T12:00:00Z"),
      created("t2", "Email", "2026-09-05T12:00:00Z"),
      started("t1", "2026-09-05T12:00:00Z"),
      started("t2", "2026-09-09T12:00:00Z"),
    ];
    const [lane] = slice(log, "2026-09-08").lanes;
    expect(lane.ms).toBe(24 * HOUR);
    expect(lane.segments[0].fromEarlier).toBe(true);
    expect(lane.segments[0].intoLater).toBe(true);
    expect(slice(log, "2026-09-08").readings.trackedMs).toBe(24 * HOUR);
  });

  it("clips the running interval at the clock, and a later clock lengthens it", () => {
    const early = slice(spanning, "2026-09-08", NOW).readings.longest;
    const late = slice(spanning, "2026-09-08", NOW + 2 * HOUR).readings.longest;
    expect(early?.open).toBe(true);
    expect(early?.ms).toBe(1.5 * HOUR);
    expect(late?.ms).toBe(3.5 * HOUR);
  });

  it("counts a day with nothing recorded as empty rather than failing", () => {
    const empty = slice(spanning, "2026-09-01");
    expect(empty.lanes).toEqual([]);
    expect(empty.readings).toEqual({
      trackedMs: 0,
      switches: 0,
      longest: null,
    });
    expect(empty.hasPossiblyForgotten).toBe(false);
  });
});

describe("possibly forgotten intervals", () => {
  const runFor = (ms: number) => [
    created("t1", "Login flow", "2026-09-08T00:00:00Z"),
    started("t1", "2026-09-08T00:00:00Z"),
    paused(new Date(Date.parse("2026-09-08T00:00:00Z") + ms).toISOString()),
  ];

  it("marks only intervals longer than twelve hours", () => {
    const below = slice(runFor(9 * HOUR), "2026-09-08");
    expect(below.hasPossiblyForgotten).toBe(false);

    const at = slice(runFor(12 * HOUR), "2026-09-08");
    expect(at.lanes[0].segments[0].possiblyForgotten).toBe(false);
    expect(at.hasPossiblyForgotten).toBe(false);

    const over = slice(runFor(12 * HOUR + 1), "2026-09-08");
    expect(over.lanes[0].segments[0].possiblyForgotten).toBe(true);
    expect(over.hasPossiblyForgotten).toBe(true);
  });

  it("marks on the whole interval, not on the part inside the day", () => {
    const log = [
      created("t1", "Login flow", "2026-09-07T17:00:00Z"),
      started("t1", "2026-09-07T17:00:00Z"),
      paused("2026-09-08T06:00:00Z"),
    ];
    // Thirteen hours in total; six fall inside the second day.
    const segment = slice(log, "2026-09-08").lanes[0].segments[0];
    expect(segment.ms).toBe(6 * HOUR);
    expect(segment.possiblyForgotten).toBe(true);
  });

  it("still counts a marked stretch in the readings", () => {
    const { readings } = slice(runFor(13 * HOUR), "2026-09-08");
    expect(readings.trackedMs).toBe(13 * HOUR);
    expect(readings.longest?.possiblyForgotten).toBe(true);
  });
});

describe("readings", () => {
  it("sums each topic's time inside the day", () => {
    const { lanes, readings } = slice(spanning, "2026-09-08");
    expect(lanes.map((lane) => [label(lane.subject), lane.ms])).toEqual([
      // One hour before the switch to Email, and ninety minutes still running.
      ["t1", 2.5 * HOUR],
      ["t2", HOUR],
    ]);
    expect(readings.trackedMs).toBe(3.5 * HOUR);
  });

  it("counts a switch for each topic entry opened inside the day", () => {
    // Email and the return to Login flow. The stop is not a switch, and the
    // previous evening's start belongs to the day before.
    expect(slice(spanning, "2026-09-08").readings.switches).toBe(2);
    expect(slice(spanning, "2026-09-07").readings.switches).toBe(1);
  });

  it("counts an entry at midnight in the day it opens", () => {
    const log = [
      created("t1", "Login flow", "2026-09-07T22:00:00Z"),
      created("t2", "Email", "2026-09-07T22:00:00Z"),
      started("t1", "2026-09-07T22:00:00Z"),
      started("t2", "2026-09-08T00:00:00Z"),
    ];
    expect(slice(log, "2026-09-07").readings.switches).toBe(1);
    expect(
      slice(log, "2026-09-08", Date.parse("2026-09-08T05:00:00Z")).readings
        .switches,
    ).toBe(1);
  });

  it("reports the longest single topic stretch", () => {
    const log = [
      created("t1", "Login flow", "2026-09-08T08:00:00Z"),
      started("t1", "2026-09-08T08:00:00Z"),
      paused("2026-09-08T09:00:00Z"),
      started("t1", "2026-09-08T12:00:00Z"),
      paused("2026-09-08T12:30:00Z"),
    ];
    // The stop between them is three hours, longer than either stretch of work.
    const longest = slice(log, "2026-09-08", Date.parse("2026-09-08T13:00:00Z"))
      .readings.longest;
    expect(longest?.subject).toEqual({ type: "topic", topicId: "t1" });
    expect(longest?.ms).toBe(HOUR);
  });
});

describe("a stop", () => {
  const log = [
    created("t1", "Login flow", "2026-09-08T08:00:00Z"),
    started("t1", "2026-09-08T08:00:00Z"),
    paused("2026-09-08T09:00:00Z"),
    started("t1", "2026-09-08T12:00:00Z"),
  ];
  const day = () =>
    slice(log, "2026-09-08", Date.parse("2026-09-08T12:30:00Z"));

  it("is absence: no lane, no time, and no mark", () => {
    const { lanes, readings, hasPossiblyForgotten } = day();
    expect(lanes.map((lane) => label(lane.subject))).toEqual(["t1"]);
    // One hour of work, then half an hour; the three hours stopped are a gap.
    expect(lanes[0].segments.map((segment) => segment.ms)).toEqual([
      HOUR,
      0.5 * HOUR,
    ]);
    expect(readings.trackedMs).toBe(1.5 * HOUR);
    expect(hasPossiblyForgotten).toBe(false);
  });

  it("is not marked, however long it runs", () => {
    // Stopped for four days: deliberate, not a switch that was forgotten.
    const stopped = [
      created("t1", "Login flow", "2026-09-08T08:00:00Z"),
      started("t1", "2026-09-08T08:00:00Z"),
      paused("2026-09-08T09:00:00Z"),
    ];
    const after = slice(
      stopped,
      "2026-09-12",
      Date.parse("2026-09-12T10:00:00Z"),
    );
    expect(after.lanes).toEqual([]);
    expect(after.hasPossiblyForgotten).toBe(false);
    expect(after.readings).toEqual({
      trackedMs: 0,
      switches: 0,
      longest: null,
    });
  });

  it("leaves a day that holds nothing but a stop empty", () => {
    // Stopped on the eighth and not resumed: the ninth has nothing to show.
    const stopped = [...spanning, paused("2026-09-08T03:00:00Z")];
    expect(
      slice(stopped, "2026-09-09", Date.parse("2026-09-09T10:00:00Z")).lanes,
    ).toEqual([]);
  });
});

describe("lanes", () => {
  it("orders topics by creation, not by use", () => {
    const log = [
      created("t1", "Login flow", "2026-09-08T08:00:00Z"),
      created("t2", "Email", "2026-09-08T08:01:00Z"),
      started("t2", "2026-09-08T09:30:00Z"),
      started("t1", "2026-09-08T10:00:00Z"),
    ];
    const state = slice(log, "2026-09-08", Date.parse("2026-09-08T11:00:00Z"));
    expect(state.lanes.map((lane) => label(lane.subject))).toEqual([
      "t1",
      "t2",
    ]);
  });

  it("gives a topic with no creation event a lane after the known ones", () => {
    const log = [
      created("t1", "Login flow", "2026-09-08T08:00:00Z"),
      started("t9", "2026-09-08T08:00:00Z"),
      started("t1", "2026-09-08T09:00:00Z"),
      paused("2026-09-08T09:30:00Z"),
    ];
    const state = slice(log, "2026-09-08", Date.parse("2026-09-08T10:00:00Z"));
    expect(state.lanes.map((lane) => label(lane.subject))).toEqual([
      "t1",
      "t9",
    ]);
  });

  it("leaves out a subject with no time in the day", () => {
    const state = slice(spanning, "2026-09-07");
    expect(state.lanes.map((lane) => label(lane.subject))).toEqual(["t1"]);
  });
});

describe("purity", () => {
  it("depends on its arguments alone", () => {
    const state = foldLog(spanning);
    const { start, end } = bounds("2026-09-08");
    expect(sliceDay(state, start, end, NOW)).toEqual(
      sliceDay(state, start, end, NOW),
    );
    // Shuffling the log changes nothing: the fold, not the file order, decides.
    const shuffled = foldLog([...spanning].reverse());
    expect(sliceDay(shuffled, start, end, NOW)).toEqual(
      sliceDay(state, start, end, NOW),
    );
  });
});
