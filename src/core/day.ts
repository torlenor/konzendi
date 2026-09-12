import type { Interval, Subject, TrackingState } from "./fold";
import { sameSubject } from "./fold";

/**
 * One local day of the timeline, and the readings that go with it.
 *
 * Pure and total, like the fold: the day is given as two instants and the clock as a
 * number, so this module resolves no timezone and reads no clock of its own. It measures
 * what the log holds and marks what looks wrong; it never invents an end for an interval
 * that has none, and it appends nothing.
 *
 * Only topics are measured. A stop — the state the log records as `focus.paused` — means
 * nothing was tracked, so it is absence here: no lane, no sum, and no mark. It shows as
 * the gap between two topic segments.
 */

/**
 * An interval longer than this was probably left running by a switch nobody logged.
 * A display mark only: nothing stored depends on it, and a marked segment is still
 * drawn and still counted.
 */
export const POSSIBLY_FORGOTTEN_MS = 8 * 60 * 60 * 1000;

export interface DaySegment {
  /** The entry that opened the interval; the entry list can correct it. */
  eventId: string;
  subject: Subject;
  /** Clipped to the day. */
  start: string;
  end: string;
  /** Length inside the day. */
  ms: number;
  /** The interval began before this day. */
  fromEarlier: boolean;
  /** The interval runs past the end of this day. */
  intoLater: boolean;
  /** The interval has no end yet: it is the running one. */
  open: boolean;
  /** The whole interval, not only the part shown, exceeds the threshold. */
  possiblyForgotten: boolean;
}

/** One row of the timeline: one topic and every stretch of the day it holds. */
export interface Lane {
  subject: Subject;
  segments: readonly DaySegment[];
  /** Time recorded against this subject inside the day. */
  ms: number;
}

export interface DayReadings {
  /** Time recorded against topics inside the day. */
  trackedMs: number;
  /** Entries that started work on a topic inside the day. A stop is not a switch. */
  switches: number;
  /** The longest single topic segment inside the day. Null when the day has none. */
  longest: DaySegment | null;
}

export interface Day {
  start: string;
  end: string;
  /** Topics in creation order, then topics with no creation event. */
  lanes: readonly Lane[];
  readings: DayReadings;
  /** True when any drawn segment is marked, so a reading can say what it contains. */
  hasPossiblyForgotten: boolean;
}

/** The part of an interval that falls inside the day, or null when none does. */
function clip(
  interval: Interval,
  dayStart: number,
  dayEnd: number,
  now: number,
): DaySegment | null {
  const startMs = Date.parse(interval.start);
  // An interval with no end is still running: it reaches the clock and no further.
  const stopMs =
    interval.end === null ? Math.max(startMs, now) : Date.parse(interval.end);
  const fromMs = Math.max(startMs, dayStart);
  const toMs = Math.min(stopMs, dayEnd);
  if (toMs <= fromMs) return null;
  return {
    eventId: interval.eventId,
    subject: interval.subject,
    // The original text is kept where the boundary is not moved, so no precision is lost.
    start: fromMs === startMs ? interval.start : new Date(fromMs).toISOString(),
    end:
      interval.end !== null && toMs === stopMs
        ? interval.end
        : new Date(toMs).toISOString(),
    ms: toMs - fromMs,
    fromEarlier: startMs < dayStart,
    intoLater: stopMs > dayEnd,
    open: interval.end === null,
    possiblyForgotten: stopMs - startMs > POSSIBLY_FORGOTTEN_MS,
  };
}

/**
 * Slice the folded timeline into one day of lanes and readings.
 *
 * `dayStart` and `dayEnd` are the instants the local day begins and ends; `now` is the
 * clock in milliseconds, used only to bound the running interval.
 */
export function sliceDay(
  state: TrackingState,
  dayStart: string,
  dayEnd: string,
  now: number,
): Day {
  const fromMs = Date.parse(dayStart);
  const toMs = Date.parse(dayEnd);

  const segments: DaySegment[] = [];
  let switches = 0;
  for (const interval of state.timeline) {
    // A stop is not time spent on anything, so it is left out entirely rather than
    // drawn as a subject. The topic segments around it leave the gap it occupied.
    if (interval.subject.type !== "topic") continue;
    const openedAt = Date.parse(interval.start);
    if (openedAt >= fromMs && openedAt < toMs) switches += 1;
    const segment = clip(interval, fromMs, toMs, now);
    if (segment) segments.push(segment);
  }

  // Lane order is the order of the topic registry, which is creation order, so a lane
  // keeps its row from one day to the next. A topic whose creation is not in the log
  // still gets a lane, after the known ones.
  const order: Subject[] = [
    ...state.topics.map(
      (topic): Subject => ({ type: "topic", topicId: topic.id }),
    ),
  ];
  for (const segment of segments) {
    if (!order.some((subject) => sameSubject(subject, segment.subject))) {
      order.push(segment.subject);
    }
  }

  const lanes: Lane[] = [];
  for (const subject of order) {
    const own = segments.filter((segment) =>
      sameSubject(segment.subject, subject),
    );
    if (own.length === 0) continue;
    lanes.push({
      subject,
      segments: own,
      ms: own.reduce((total, segment) => total + segment.ms, 0),
    });
  }

  let longest: DaySegment | null = null;
  for (const segment of segments) {
    if (longest === null || segment.ms > longest.ms) longest = segment;
  }

  return {
    start: dayStart,
    end: dayEnd,
    lanes,
    readings: {
      trackedMs: lanes.reduce((total, lane) => total + lane.ms, 0),
      switches,
      longest,
    },
    hasPossiblyForgotten: segments.some((segment) => segment.possiblyForgotten),
  };
}
