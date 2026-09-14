import type { Subject, Topic } from "./core/fold";
import {
  entryRetimed,
  entryRevoked,
  focusPaused,
  focusStarted,
  type QuickKey,
  topicArchived,
  topicColorSet,
  topicCreated,
  topicQuickKeySet,
  topicRenamed,
  topicRestored,
} from "./core/tracking";
import { nowIso } from "./time";
import type { Tracking } from "./useTracking";

/**
 * Every user action, as the events it appends. Nothing here changes state directly:
 * the screens re-render from a fold of the log.
 */
export function trackingActions(record: Tracking["record"]) {
  return {
    switchTo: (topicId: string) => record(focusStarted(topicId, nowIso())),
    stop: () => record(focusPaused(nowIso())),
    /** One user action, two events: the topic is named at the moment of tracking. */
    createAndTrack: (name: string) => {
      const topicId = crypto.randomUUID();
      return record(
        topicCreated(topicId, name),
        focusStarted(topicId, nowIso()),
      );
    },
    undo: (eventId: string) => record(entryRevoked(eventId)),
    /** Revoking the revocations is how an entry comes back. */
    restore: (revokedBy: readonly string[]) =>
      record(...revokedBy.map(entryRevoked)),
    retime: (eventId: string, effectiveAt: string) =>
      record(entryRetimed(eventId, effectiveAt)),
    addMissed: (subject: Subject, effectiveAt: string) =>
      record(
        subject.type === "pause"
          ? focusPaused(effectiveAt)
          : focusStarted(subject.topicId, effectiveAt),
      ),
    rename: (topicId: string, name: string) =>
      record(topicRenamed(topicId, name)),
    archive: (topicId: string) => record(topicArchived(topicId)),
    unarchive: (topicId: string) => record(topicRestored(topicId)),
    /** One event also takes the key from its previous owner; the fold applies both. */
    setQuickKey: (topicId: string, key: QuickKey | null) =>
      record(topicQuickKeySet(topicId, key)),
    setColor: (topicId: string, color: string | null) =>
      record(topicColorSet(topicId, color)),
  };
}

export type Actions = ReturnType<typeof trackingActions>;

/** A tracking event can name a topic whose creation has not been merged yet. */
export function nameOf(topics: readonly Topic[], topicId: string): string {
  return (
    topics.find((topic) => topic.id === topicId)?.name ??
    `Unknown topic ${topicId.slice(0, 8)}`
  );
}

/** The color of a subject's topic. A stop and a topic without a color have none. */
export function colorOf(
  topics: readonly Topic[],
  subject: Subject,
): string | null {
  if (subject.type === "pause") return null;
  return topics.find((topic) => topic.id === subject.topicId)?.color ?? null;
}

export function subjectLabel(
  topics: readonly Topic[],
  subject: Subject,
): string {
  return subject.type === "pause" ? "Stopped" : nameOf(topics, subject.topicId);
}

/** The two marks the interface uses for a subject, and the rule that picks one. */
export const TOPIC_MARK = "▶";
export const STOP_MARK = "■";

export const subjectMark = (subject: Subject) =>
  subject.type === "pause" ? STOP_MARK : TOPIC_MARK;
