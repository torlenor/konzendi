import {
  compareIds,
  compareTimestamps,
  type EventRecord,
  mergeEvents,
} from "./events";
import {
  isTrackingEvent,
  type KnownEvent,
  readEvent,
  type TrackingEvent,
} from "./tracking";

/** What an interval is spent on. A pause is not a topic. */
export type Subject = { type: "topic"; topicId: string } | { type: "pause" };

export interface Topic {
  id: string;
  name: string;
  archived: boolean;
}

/** One tracking event as the entry list shows it, revoked ones included. */
export interface Entry {
  /** The event that recorded this entry; corrections reference it. */
  id: string;
  subject: Subject;
  /** After any correction. */
  effectiveAt: string;
  recordedAt: string;
  retimed: boolean;
  revoked: boolean;
  /** The effective revocations to revoke in turn to restore this entry. */
  revokedBy: readonly string[];
}

export interface Interval {
  /** The entry that opened the interval. */
  eventId: string;
  subject: Subject;
  start: string;
  /** Null for the interval that is still running. */
  end: string | null;
}

export interface TrackingState {
  /** Known topics in creation order; a topic exists once its creation is effective. */
  topics: readonly Topic[];
  /** Every tracking event in timeline order, effective or not. */
  entries: readonly Entry[];
  /** Intervals of non-zero length, ending with the open one. */
  timeline: readonly Interval[];
  /** The open interval, or null on first run. */
  current: Interval | null;
}

export function sameSubject(a: Subject, b: Subject): boolean {
  return a.type === "pause" && b.type === "pause"
    ? true
    : a.type === "topic" && b.type === "topic" && a.topicId === b.topicId;
}

function subjectOf(event: TrackingEvent): Subject {
  return event.kind === "focus.paused"
    ? { type: "pause" }
    : { type: "topic", topicId: event.payload.topicId };
}

/** Timeline order: what the entry says happened, not when it was recorded. */
function compareTimeline(a: Entry, b: Entry): number {
  return (
    compareTimestamps(a.effectiveAt, b.effectiveAt) ||
    compareTimestamps(a.recordedAt, b.recordedAt) ||
    compareIds(a.id, b.id)
  );
}

/**
 * Fold device logs into the current state and the interval timeline.
 *
 * Pure and total: the result depends on the merged log alone, never on which device
 * folds it, on the order the logs are passed, or on the wall clock. Merge order and
 * timeline order are kept apart throughout; they differ whenever an entry was
 * back-dated or corrected.
 */
export function foldLog(
  ...logs: readonly (readonly EventRecord[])[]
): TrackingState {
  // 1. Merge.
  const known: KnownEvent[] = [];
  for (const record of mergeEvents(...logs)) {
    const event = readEvent(record);
    if (event) known.push(event);
  }

  // 2. Effectiveness, resolved on the reference graph rather than on log position,
  //    so that a revocation recorded before its target by a skewed clock still applies.
  const byId = new Map<string, KnownEvent>();
  const revocations = new Map<string, string[]>();
  for (const event of known) {
    byId.set(event.id, event);
    if (event.kind === "entry.revoked") {
      const target = event.payload.targetId;
      revocations.set(target, [...(revocations.get(target) ?? []), event.id]);
    }
  }
  const settled = new Map<string, boolean>();
  const resolving = new Set<string>();
  const isEffective = (id: string): boolean => {
    const cached = settled.get(id);
    if (cached !== undefined) return cached;
    // An event id cannot be referenced before it exists, so the graph is acyclic.
    // The guard only keeps a corrupt self-referencing log from recursing forever.
    if (resolving.has(id)) return false;
    resolving.add(id);
    const effective = !(revocations.get(id) ?? []).some(isEffective);
    resolving.delete(id);
    settled.set(id, effective);
    return effective;
  };
  const effectiveRevocationsOf = (id: string): string[] =>
    (revocations.get(id) ?? []).filter(isEffective);

  // 3. Topic registry. Creation and maintenance are applied in two passes, because two
  //    devices can deliver a rename ahead of the creation it renames.
  const topics = new Map<string, Topic>();
  for (const event of known) {
    if (event.kind !== "topic.created" || !isEffective(event.id)) continue;
    if (!topics.has(event.payload.topicId)) {
      topics.set(event.payload.topicId, {
        id: event.payload.topicId,
        name: event.payload.name,
        archived: false,
      });
    }
  }
  for (const event of known) {
    if (
      event.kind !== "topic.renamed" &&
      event.kind !== "topic.archived" &&
      event.kind !== "topic.restored"
    )
      continue;
    const topic = topics.get(event.payload.topicId);
    if (!topic || !isEffective(event.id)) continue;
    if (event.kind === "topic.renamed") topic.name = event.payload.name;
    else topic.archived = event.kind === "topic.archived";
  }

  // 4. Timeline. A correction of a correction targets the same original entry, so the
  //    last effective retime in merge order wins.
  const retimed = new Map<string, string>();
  for (const event of known) {
    if (event.kind !== "entry.retimed" || !isEffective(event.id)) continue;
    const target = byId.get(event.payload.targetId);
    // An absent or non-tracking target is retained and has no effect unless it later
    // qualifies; the next fold reconsiders it.
    if (target && isTrackingEvent(target)) {
      retimed.set(target.id, event.payload.effectiveAt);
    }
  }

  const entries: Entry[] = known
    .filter(isTrackingEvent)
    .map((event) => ({
      id: event.id,
      subject: subjectOf(event),
      effectiveAt: retimed.get(event.id) ?? event.payload.effectiveAt,
      recordedAt: event.recordedAt,
      retimed: retimed.has(event.id),
      revoked: !isEffective(event.id),
      revokedBy: effectiveRevocationsOf(event.id),
    }))
    .sort(compareTimeline);

  // Coalesce: an entry repeating the previous subject opens no interval, so a double
  // press, or the same switch arriving twice, is harmless.
  const openings: Entry[] = [];
  for (const entry of entries) {
    if (entry.revoked) continue;
    const previous = openings.at(-1);
    if (previous && sameSubject(previous.subject, entry.subject)) continue;
    openings.push(entry);
  }
  const intervals: Interval[] = openings.map((entry, index) => ({
    eventId: entry.id,
    subject: entry.subject,
    start: entry.effectiveAt,
    end: openings[index + 1]?.effectiveAt ?? null,
  }));

  return {
    topics: [...topics.values()],
    entries,
    // A zero-length interval, from two subjects sharing an instant, is not shown; the
    // events stay in the log and still decide which entry is current.
    timeline: intervals.filter(
      (interval) =>
        interval.end === null ||
        compareTimestamps(interval.start, interval.end) !== 0,
    ),
    current: intervals.at(-1) ?? null,
  };
}
