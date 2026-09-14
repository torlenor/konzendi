import { useCallback, useEffect, useMemo, useState } from "react";
import { type EventRecord, mergeEvents } from "./core/events";
import { foldLog, type TrackingState } from "./core/fold";
import type { EventDraft, EventKind } from "./core/tracking";
import { appendEvent, onEventAppended, readLog } from "./store";

const naming: Record<EventKind, string> = {
  "topic.created": "the new topic",
  "topic.renamed": "the new name",
  "topic.archived": "archiving the topic",
  "topic.restored": "restoring the topic",
  "topic.quick-key-set": "the quick key",
  "topic.color-set": "the topic color",
  "focus.started": "the switch",
  "focus.paused": "the stop",
  "entry.revoked": "the undo",
  "entry.retimed": "the corrected time",
};

export interface Tracking {
  state: TrackingState;
  loading: boolean;
  busy: boolean;
  error: string | null;
  dismissError: () => void;
  /** Append events in order and fold again. False when nothing further was recorded. */
  record: (...drafts: EventDraft[]) => Promise<boolean>;
}

/**
 * The log lives here and nothing else does: every screen reads a fold of it, and every
 * action appends. The store returns the record it wrote, so an append advances the log
 * in memory; it is read from disk at startup and again after a failure, because a
 * failed call may still have been written.
 *
 * Each window holds its own copy, so the store's broadcast advances the copy belonging
 * to the window that did not write. Merging deduplicates by event id, which makes the
 * writer's own broadcast harmless.
 */
export function useTracking(): Tracking {
  const [log, setLog] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const state = useMemo(() => foldLog(log), [log]);

  useEffect(() => {
    readLog()
      .then((records) => setLog((current) => mergeEvents(current, records)))
      .catch((failure: unknown) =>
        setError(`Could not read the stored log: ${String(failure)}.`),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const subscription = onEventAppended((event) =>
      setLog((current) => mergeEvents(current, [event])),
    );
    return () => {
      void subscription.then((unlisten) => unlisten());
    };
  }, []);

  const record = useCallback(async (...drafts: EventDraft[]) => {
    setBusy(true);
    const written: EventRecord[] = [];
    try {
      for (const draft of drafts) written.push(await appendEvent(draft));
      setLog((current) => mergeEvents(current, written));
      // A recorded action clears a message about an earlier one that was not.
      setError(null);
      return true;
    } catch (failure) {
      const failed = drafts[written.length];
      const partial = written
        .map((event) => naming[event.kind as EventKind])
        .join(" and ");
      let message = `Could not record ${naming[failed.kind]}: ${String(failure)}.`;
      if (partial) message += ` ${partial} was recorded and stands.`;
      try {
        setLog(await readLog());
        message +=
          " The stored log was read again, so the screen shows what is recorded.";
      } catch (secondary) {
        message += ` The log could not be read either (${String(secondary)}); restart the application.`;
      }
      setError(message);
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  return {
    state,
    loading,
    busy,
    error,
    dismissError: useCallback(() => setError(null), []),
    record,
  };
}

/** A clock for the elapsed time, which is the one value no event changes. */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}
