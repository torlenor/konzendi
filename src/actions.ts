import type { Subject, Topic, TrackingState } from "./core/fold";
import {
  BRIEF_TOPIC_SELECTION,
  DIRECT_SELECTION,
  type EventDraft,
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

/** A direct selection at or above this age no longer counts as a misclick. */
export const BRIEF_SELECTION_THRESHOLD_MS = 3000;

/** How a direct topic selection was recorded, so a surface can show feedback. */
export type SelectionResult =
  | { status: "switched" }
  | { status: "corrected"; topicId: string }
  | { status: "failed" };

/** The brief direct selection a new one would correct, and what preceded it. */
interface BriefCandidate {
  entryId: string;
  topicId: string;
  precedingSubject: Subject | null;
}

/**
 * The current interval's opening entry, if a new direct selection would correct it: a
 * direct selection, not retimed, and less than the threshold old at `now`. A missed
 * switch, a retimed entry, and an entry already older than the threshold are never
 * corrected, whatever their subject.
 */
function briefCandidate(
  state: TrackingState,
  now: string,
): BriefCandidate | null {
  const current = state.current;
  if (current === null || current.subject.type !== "topic") return null;
  const entry = state.entries.find(
    (candidate) => candidate.id === current.eventId,
  );
  if (!entry?.directSelection || entry.retimed) return null;
  const age = Date.parse(now) - Date.parse(entry.effectiveAt);
  if (age >= BRIEF_SELECTION_THRESHOLD_MS) return null;
  return {
    entryId: entry.id,
    topicId: current.subject.topicId,
    precedingSubject: state.timeline.at(-2)?.subject ?? null,
  };
}

type PendingResult =
  | { status: "switched" }
  | { status: "corrected"; topicId: string };

/** The events a direct selection of `topicId` appends, and the feedback it reports. */
function selectionDrafts(
  state: TrackingState,
  topicId: string,
  now: string,
): { drafts: EventDraft[]; result: PendingResult } {
  const current = state.current;
  // Reselecting the running topic is the existing coalesce rule's harmless no-op, not
  // a misclick to correct: it must not revoke the very entry it would otherwise repeat.
  const reselectsCurrent =
    current !== null &&
    current.subject.type === "topic" &&
    current.subject.topicId === topicId;
  const brief = reselectsCurrent ? null : briefCandidate(state, now);
  if (brief === null) {
    return {
      drafts: [focusStarted(topicId, now, DIRECT_SELECTION)],
      result: { status: "switched" },
    };
  }
  const redundant =
    brief.precedingSubject !== null &&
    brief.precedingSubject.type === "topic" &&
    brief.precedingSubject.topicId === topicId;
  const drafts: EventDraft[] = redundant
    ? [entryRevoked(brief.entryId, BRIEF_TOPIC_SELECTION)]
    : [
        entryRevoked(brief.entryId, BRIEF_TOPIC_SELECTION),
        focusStarted(topicId, now, DIRECT_SELECTION),
      ];
  return { drafts, result: { status: "corrected", topicId: brief.topicId } };
}

/**
 * Every user action, as the events it appends. Nothing here changes state directly:
 * the screens re-render from a fold of the log.
 */
export function trackingActions(record: Tracking["record"]) {
  return {
    /**
     * A direct topic selection: the surface passes its own folded state, so a brief
     * predecessor can be corrected before this selection is recorded.
     */
    switchTo: async (
      topicId: string,
      state: TrackingState,
    ): Promise<SelectionResult> => {
      const { drafts, result } = selectionDrafts(state, topicId, nowIso());
      const stored = await record(...drafts);
      return stored ? result : { status: "failed" };
    },
    stop: () => record(focusPaused(nowIso())),
    /**
     * One user action, two or three events: the topic is named at the moment of
     * tracking, and a brief predecessor is corrected the same way a switch is.
     */
    createAndTrack: async (
      name: string,
      state: TrackingState,
    ): Promise<SelectionResult> => {
      const topicId = crypto.randomUUID();
      const now = nowIso();
      const brief = briefCandidate(state, now);
      const drafts: EventDraft[] = [topicCreated(topicId, name)];
      if (brief !== null) {
        drafts.push(entryRevoked(brief.entryId, BRIEF_TOPIC_SELECTION));
      }
      drafts.push(focusStarted(topicId, now, DIRECT_SELECTION));
      const stored = await record(...drafts);
      if (!stored) return { status: "failed" };
      return brief !== null
        ? { status: "corrected", topicId: brief.topicId }
        : { status: "switched" };
    },
    /** Topics prepares a topic without tracking it, so it appends the creation only. */
    create: (name: string) => record(topicCreated(crypto.randomUUID(), name)),
    undo: (eventId: string) => record(entryRevoked(eventId)),
    /** Revoking the revocations is how an entry comes back. */
    restore: (revokedBy: readonly string[]) =>
      record(...revokedBy.map((eventId) => entryRevoked(eventId))),
    retime: (eventId: string, effectiveAt: string) =>
      record(entryRetimed(eventId, effectiveAt)),
    /** A missed switch never carries the direct-selection origin: it is not a click. */
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

/** The text every surface shows after a brief direct selection was corrected. */
export function briefCorrectionMessage(
  topics: readonly Topic[],
  topicId: string,
): string {
  return `Brief switch to ${nameOf(topics, topicId)} ignored.`;
}

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
