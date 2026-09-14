import type { EventRecord } from "./events";

/**
 * The event vocabulary of the tracking design. The Rust store keeps kinds and payloads
 * opaque, so this module is the only place that knows what an event means.
 */
export interface TrackingPayloads {
  "topic.created": { topicId: string; name: string };
  "topic.renamed": { topicId: string; name: string };
  "topic.archived": { topicId: string };
  "topic.restored": { topicId: string };
  /** A quick key from 1 to 9, or null to clear the topic's key. */
  "topic.quick-key-set": { topicId: string; key: QuickKey | null };
  /** A `#rrggbb` color, or null to clear the topic's color. */
  "topic.color-set": { topicId: string; color: string | null };
  "focus.started": { topicId: string; effectiveAt: string };
  "focus.paused": { effectiveAt: string };
  "entry.revoked": { targetId: string };
  "entry.retimed": { targetId: string; effectiveAt: string };
}

export type EventKind = keyof TrackingPayloads;

/** The digits a topic can hold as its quick key. */
export type QuickKey = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export function isQuickKey(value: unknown): value is QuickKey {
  return (
    Number.isInteger(value) && (value as number) >= 1 && (value as number) <= 9
  );
}

/** Six hexadecimal digits after `#`, in either case. No shorthand, name, or alpha. */
const COLOR = /^#[0-9a-f]{6}$/i;

export function isTopicColor(value: unknown): value is string {
  return typeof value === "string" && COLOR.test(value);
}

/** What an action hands to the store; the store assigns id, device, and recordedAt. */
export type EventDraft<K extends EventKind = EventKind> = K extends EventKind
  ? { kind: K; payload: TrackingPayloads[K] }
  : never;

/** A stored record whose payload has been checked against its kind. */
export type KnownEvent<K extends EventKind = EventKind> = K extends EventKind
  ? Omit<EventRecord, "kind" | "payload"> & {
      kind: K;
      payload: TrackingPayloads[K];
    }
  : never;

/** The two kinds that open an interval and carry a time of their own. */
export type TrackingEvent = KnownEvent<"focus.started" | "focus.paused">;

export function isTrackingEvent(event: KnownEvent): event is TrackingEvent {
  return event.kind === "focus.started" || event.kind === "focus.paused";
}

type Fields = Record<string, unknown>;

function identifier(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function instant(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

const readers: {
  [K in EventKind]: (fields: Fields) => TrackingPayloads[K] | null;
} = {
  "topic.created": (fields) =>
    identifier(fields.topicId) && typeof fields.name === "string"
      ? { topicId: fields.topicId, name: fields.name }
      : null,
  "topic.renamed": (fields) =>
    identifier(fields.topicId) && typeof fields.name === "string"
      ? { topicId: fields.topicId, name: fields.name }
      : null,
  "topic.archived": (fields) =>
    identifier(fields.topicId) ? { topicId: fields.topicId } : null,
  "topic.restored": (fields) =>
    identifier(fields.topicId) ? { topicId: fields.topicId } : null,
  // A missing value is not a clear: only an explicit null clears.
  "topic.quick-key-set": (fields) =>
    identifier(fields.topicId) &&
    (fields.key === null || isQuickKey(fields.key))
      ? { topicId: fields.topicId, key: fields.key }
      : null,
  "topic.color-set": (fields) =>
    identifier(fields.topicId) &&
    (fields.color === null || isTopicColor(fields.color))
      ? { topicId: fields.topicId, color: fields.color }
      : null,
  "focus.started": (fields) =>
    identifier(fields.topicId) && instant(fields.effectiveAt)
      ? { topicId: fields.topicId, effectiveAt: fields.effectiveAt }
      : null,
  "focus.paused": (fields) =>
    instant(fields.effectiveAt) ? { effectiveAt: fields.effectiveAt } : null,
  "entry.revoked": (fields) =>
    identifier(fields.targetId) ? { targetId: fields.targetId } : null,
  "entry.retimed": (fields) =>
    identifier(fields.targetId) && instant(fields.effectiveAt)
      ? { targetId: fields.targetId, effectiveAt: fields.effectiveAt }
      : null,
};

/**
 * Narrow a stored record to a known event, or return null for a kind this build does
 * not know and for a payload that does not match its kind. Both are ignored rather
 * than treated as errors, so a log written by another version stays readable.
 */
export function readEvent(record: EventRecord): KnownEvent | null {
  const reader = readers[record.kind as EventKind] as
    | ((fields: Fields) => TrackingPayloads[EventKind] | null)
    | undefined;
  if (!reader) return null;
  const { payload } = record;
  if (typeof payload !== "object" || payload === null || Array.isArray(payload))
    return null;
  const checked = reader(payload as Fields);
  if (checked === null) return null;
  // The reader returned the payload for exactly this record's kind.
  return { ...record, payload: checked } as KnownEvent;
}

export function topicCreated(
  topicId: string,
  name: string,
): EventDraft<"topic.created"> {
  return { kind: "topic.created", payload: { topicId, name } };
}

export function topicRenamed(
  topicId: string,
  name: string,
): EventDraft<"topic.renamed"> {
  return { kind: "topic.renamed", payload: { topicId, name } };
}

export function topicArchived(topicId: string): EventDraft<"topic.archived"> {
  return { kind: "topic.archived", payload: { topicId } };
}

export function topicRestored(topicId: string): EventDraft<"topic.restored"> {
  return { kind: "topic.restored", payload: { topicId } };
}

export function topicQuickKeySet(
  topicId: string,
  key: QuickKey | null,
): EventDraft<"topic.quick-key-set"> {
  return { kind: "topic.quick-key-set", payload: { topicId, key } };
}

export function topicColorSet(
  topicId: string,
  color: string | null,
): EventDraft<"topic.color-set"> {
  return {
    kind: "topic.color-set",
    payload: { topicId, color: color === null ? null : color.toLowerCase() },
  };
}

export function focusStarted(
  topicId: string,
  effectiveAt: string,
): EventDraft<"focus.started"> {
  return { kind: "focus.started", payload: { topicId, effectiveAt } };
}

export function focusPaused(effectiveAt: string): EventDraft<"focus.paused"> {
  return { kind: "focus.paused", payload: { effectiveAt } };
}

export function entryRevoked(targetId: string): EventDraft<"entry.revoked"> {
  return { kind: "entry.revoked", payload: { targetId } };
}

export function entryRetimed(
  targetId: string,
  effectiveAt: string,
): EventDraft<"entry.retimed"> {
  return { kind: "entry.retimed", payload: { targetId, effectiveAt } };
}
