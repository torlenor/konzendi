import { POSSIBLY_FORGOTTEN_MS } from "./day";
import type { Subject, TrackingState } from "./fold";
import { sameSubject } from "./fold";

/**
 * One local Monday-to-Sunday week, as the sessions it holds.
 *
 * Pure and total, like the fold and the day: the week is given as two instants and the
 * clock as a number, so this module resolves no timezone and reads no clock of its own.
 * It measures what the log holds. It does not estimate an entry that is missing.
 *
 * A session is a stretch of work on one topic. A stop of 15 minutes or less, followed by
 * the same topic, stays inside the session. A longer stop, or a switch to another topic,
 * ends it. The elapsed length of a session therefore includes the short stops it contains;
 * the recorded time of a topic does not, which keeps it equal to the day view.
 *
 * A session belongs to the week in which it starts. A session that starts on Sunday and
 * ends on Monday keeps its full length in the earlier week, and it is counted one time.
 */

/** A stop of this length or less, followed by the same topic, joins two stretches. */
export const SHORT_STOP_MS = 15 * 60 * 1000;

/** A session of this elapsed length or more is a session of four hours or longer. */
export const QUALIFYING_SESSION_MS = 4 * 60 * 60 * 1000;

export interface Session {
  /** The entry that opened the first stretch. It is unique, so it keys the session. */
  eventId: string;
  subject: Subject;
  start: string;
  /** The end of the last stretch, or the clock while that stretch runs. */
  end: string;
  /** From the start to the end. The short stops inside the session are included. */
  elapsedMs: number;
  /** Time recorded on the topic: the elapsed length without the stops it contains. */
  recordedMs: number;
  /** The stops that the elapsed length contains. */
  stopMs: number;
  stops: number;
  /** The last stretch has no end yet. */
  running: boolean;
  /** A stop is open and can still join this session to a later stretch. */
  onBreak: boolean;
  /** A stretch of this session is longer than 12 hours. */
  possiblyForgotten: boolean;
  /** The elapsed length is four hours or more. */
  qualifies: boolean;
}

/** One topic and the sessions the week holds for it. */
export interface TopicWeek {
  subject: Subject;
  sessions: readonly Session[];
  /** Time recorded against this topic in the week. Stops are not included. */
  recordedMs: number;
  /** The elapsed length of the longest session of the week. */
  longestMs: number;
  /** How many sessions are four hours or longer. */
  qualifying: number;
  /** A session in that count holds a stretch longer than 12 hours. */
  qualifyingPossiblyForgotten: boolean;
}

export interface Week {
  start: string;
  end: string;
  /** Every session that starts in the week, in time order. */
  sessions: readonly Session[];
  /** Topics in creation order, then topics with no creation event. */
  topics: readonly TopicWeek[];
  /** True when a session of the week is marked, so a reading can say what it contains. */
  hasPossiblyForgotten: boolean;
}

/** A session while it is built. The instants stay as numbers until it is complete. */
interface Building {
  eventId: string;
  subject: Subject;
  startMs: number;
  start: string;
  endMs: number;
  end: string;
  recordedMs: number;
  stopMs: number;
  stops: number;
  running: boolean;
  onBreak: boolean;
  possiblyForgotten: boolean;
}

function complete(session: Building): Session {
  const elapsedMs = session.endMs - session.startMs;
  return {
    eventId: session.eventId,
    subject: session.subject,
    start: session.start,
    end: session.end,
    elapsedMs,
    recordedMs: session.recordedMs,
    stopMs: session.stopMs,
    stops: session.stops,
    running: session.running,
    onBreak: session.onBreak,
    possiblyForgotten: session.possiblyForgotten,
    // An open stop does not extend the session, so it cannot make it reach four hours.
    qualifies: elapsedMs >= QUALIFYING_SESSION_MS,
  };
}

/**
 * Group the folded timeline into sessions, and read the week that holds them.
 *
 * `weekStart` and `weekEnd` are the instants the local week begins and ends; `now` is the
 * clock in milliseconds, used only to bound the running interval and the open stop.
 */
export function sliceWeek(
  state: TrackingState,
  weekStart: string,
  weekEnd: string,
  now: number,
): Week {
  const built: Building[] = [];
  let open: Building | null = null;
  // The stop between the last stretch and the next one. It joins them or it separates them.
  let stop: { startMs: number; endMs: number; running: boolean } | null = null;

  for (const interval of state.timeline) {
    const startMs = Date.parse(interval.start);
    // An interval with no end is still running: it reaches the clock and no further.
    const endMs =
      interval.end === null ? Math.max(startMs, now) : Date.parse(interval.end);

    if (interval.subject.type === "pause") {
      // A stop is absence. It is never a session, and it adds no recorded time.
      stop = { startMs, endMs, running: interval.end === null };
      continue;
    }

    const pending = stop;
    stop = null;
    let current: Building;
    if (
      open !== null &&
      pending !== null &&
      !pending.running &&
      pending.endMs - pending.startMs <= SHORT_STOP_MS &&
      sameSubject(open.subject, interval.subject)
    ) {
      open.stopMs += pending.endMs - pending.startMs;
      open.stops += 1;
      current = open;
    } else {
      if (open !== null) built.push(open);
      current = {
        eventId: interval.eventId,
        subject: interval.subject,
        startMs,
        start: interval.start,
        endMs,
        end: interval.end ?? "",
        recordedMs: 0,
        stopMs: 0,
        stops: 0,
        running: false,
        onBreak: false,
        possiblyForgotten: false,
      };
    }
    current.endMs = endMs;
    // The original text is kept where an end exists, so no precision is lost.
    current.end = interval.end ?? new Date(endMs).toISOString();
    current.recordedMs += endMs - startMs;
    current.running = interval.end === null;
    if (endMs - startMs > POSSIBLY_FORGOTTEN_MS)
      current.possiblyForgotten = true;
    open = current;
  }
  if (open !== null) {
    // The session ends at the stop. It stays frozen there while the stop can still join it.
    if (stop?.running && now - stop.startMs <= SHORT_STOP_MS) {
      open.onBreak = true;
    }
    built.push(open);
  }

  const fromMs = Date.parse(weekStart);
  const toMs = Date.parse(weekEnd);
  const sessions = built
    .filter((session) => session.startMs >= fromMs && session.startMs < toMs)
    .map(complete);

  // Topic order is the order of the topic registry, which is creation order, so a topic
  // keeps its position from one week to the next. A topic whose creation is not in the
  // log still gets a place, after the known ones.
  const order: Subject[] = state.topics.map(
    (topic): Subject => ({ type: "topic", topicId: topic.id }),
  );
  for (const session of sessions) {
    if (!order.some((subject) => sameSubject(subject, session.subject))) {
      order.push(session.subject);
    }
  }

  const topics: TopicWeek[] = [];
  for (const subject of order) {
    const own = sessions.filter((session) =>
      sameSubject(session.subject, subject),
    );
    if (own.length === 0) continue;
    topics.push({
      subject,
      sessions: own,
      recordedMs: own.reduce((total, session) => total + session.recordedMs, 0),
      longestMs: Math.max(...own.map((session) => session.elapsedMs)),
      qualifying: own.filter((session) => session.qualifies).length,
      qualifyingPossiblyForgotten: own.some(
        (session) => session.qualifies && session.possiblyForgotten,
      ),
    });
  }

  return {
    start: weekStart,
    end: weekEnd,
    sessions,
    topics,
    hasPossiblyForgotten: sessions.some((session) => session.possiblyForgotten),
  };
}
