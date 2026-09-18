import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { flushSync } from "react-dom";
import {
  type Actions,
  briefCorrectionMessage,
  STOP_MARK,
  subjectLabel,
  subjectMark,
  TOPIC_MARK,
  trackingActions,
} from "./actions";
import { topicChoices, topicForKey } from "./core/topics";
import {
  fitQuick,
  hideQuick,
  isQuickFocused,
  onQuickFocusChanged,
  quickMaxHeight,
  showMain,
} from "./desktop";
import { quickKeyPressed, watchSuperKey } from "./quickKeys";
import { Swatch } from "./Swatch";
import { formatElapsedParts } from "./time";
import { useCorrectionFeedback } from "./useCorrectionFeedback";
import { type Tracking, useNow, useTracking } from "./useTracking";
import "./App.css";

/** How long a correction keeps its rows in place before the surface dismisses. */
const CORRECTION_VISIBLE_MS = 800;

/**
 * The quick switcher: the surface Phase 1 drew, one keystroke per row and no text entry.
 * It offers switching, stopping, and undo of the last entry, which is the whole of the
 * quick-access side of Phase 1's surface boundary. It is a second window folding the
 * same log, so it shows what the tracking window shows.
 */

const STOP_KEY = "s";
const UNDO_KEY = "u";
const OPEN_MAIN_KEY = "k";

function Row({
  hint,
  label,
  color = null,
  mark,
  trailing,
  disabled,
  onPick,
}: {
  /** Null for a row that no key selects, such as a row under Other topics. */
  hint: string | null;
  label: string;
  color?: string | null;
  mark?: string;
  trailing?: string;
  disabled: boolean;
  onPick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        className="pick"
        disabled={disabled}
        onClick={onPick}
      >
        {hint === null ? (
          <span className="gap" />
        ) : (
          <span className="key">{hint}</span>
        )}
        <Swatch color={color} />
        <span className="label">{label}</span>
        <span className="mark">{mark ?? ""}</span>
        <span className="trailing">{trailing ?? ""}</span>
      </button>
    </li>
  );
}

export function QuickView() {
  const tracking = useTracking();
  const actions = useMemo(
    () => trackingActions(tracking.record),
    [tracking.record],
  );
  return <QuickSurface tracking={tracking} actions={actions} />;
}

function QuickSurface({
  tracking,
  actions,
}: {
  tracking: Tracking;
  actions: Actions;
}) {
  const { state, busy, error } = tracking;
  const [openMainError, setOpenMainError] = useState<string | null>(null);
  const now = useNow();
  const surface = useRef<HTMLDivElement>(null);
  const current = state.current;
  const stopped =
    current !== null && current.subject.type === "pause" ? current : null;
  const activeTopicId =
    current !== null && current.subject.type === "topic"
      ? current.subject.topicId
      : null;

  /**
   * A numbered row carries the key the user gave the topic in Topics, so the key does
   * not move when a topic starts or stops. The active topic stays in its list; selecting
   * it again is coalesced by the fold, so that row is harmless as well as stable.
   */
  const { assigned, unassigned } = useMemo(
    () => topicChoices(state.topics),
    [state.topics],
  );
  const hasTopics = state.topics.length > 0;
  // Other topics starts closed each time the surface opens, so the surface stays small.
  const [othersOpen, setOthersOpen] = useState(false);
  const othersId = useId();
  const [maxHeight, setMaxHeight] = useState<number | null>(null);
  const blocked = busy || tracking.loading;

  // The surface is exactly as tall as its rows, so it is measured after every render
  // and resized only when the measurement moved: the window must not chase its own
  // resize, and the elapsed reading re-renders it every second.
  const applied = useRef(0);
  useEffect(() => {
    const height = surface.current?.scrollHeight ?? 0;
    if (height > 0 && height !== applied.current) {
      applied.current = height;
      void fitQuick(height);
    }
  });

  // Other topics closes before the surface hides. X11 gives a hidden window its new size
  // only when it is shown again, and then at its old position, so a surface that shrank
  // while hidden would open off center.
  const dismiss = useCallback(async () => {
    const before = applied.current;
    // The update is flushed together with the effect above, which starts a fit of its
    // own. The fit is awaited here, so the surface does not hide before it has moved.
    flushSync(() => setOthersOpen(false));
    const height = surface.current?.scrollHeight ?? 0;
    if (height > 0 && height !== before) await fitQuick(height);
    await hideQuick();
  }, []);

  // Nothing counts as recorded until the store confirms it, so the surface closes on the
  // confirmation and stays open, with the reason, when the append failed.

  const run = useCallback(
    async (appending: Promise<boolean>) => {
      if (await appending) await dismiss();
    },
    [dismiss],
  );

  // A correction keeps the surface open for one short, visible confirmation before it
  // dismisses as usual. The accessible text outlives that: it stays in the always-mounted
  // live region for the full feedback period, including while the window is hidden.
  const [rowsCorrection, setRowsCorrection] = useState<string | null>(null);
  const correction = useCorrectionFeedback();
  const runSwitch = useCallback(
    async (switching: ReturnType<Actions["switchTo"]>) => {
      const result = await switching;
      if (result.status === "failed") return;
      if (result.status === "corrected") {
        const text = briefCorrectionMessage(state.topics, result.topicId);
        correction.show(text);
        setRowsCorrection(text);
        await new Promise((resume) =>
          setTimeout(resume, CORRECTION_VISIBLE_MS),
        );
        setRowsCorrection(null);
      }
      await dismiss();
    },
    [dismiss, correction, state.topics],
  );

  const stop = useCallback(() => {
    if (!busy && current !== null && stopped === null) void run(actions.stop());
  }, [busy, current, stopped, run, actions]);

  const undo = useCallback(() => {
    if (!busy && current !== null) void run(actions.undo(current.eventId));
  }, [busy, current, run, actions]);

  const openMain = useCallback(async () => {
    if (busy) return;
    setOpenMainError(null);
    try {
      await showMain();
    } catch (failure) {
      setOpenMainError(`Could not open Konzendi: ${String(failure)}.`);
    }
  }, [busy]);

  useEffect(() => {
    const superKey = watchSuperKey(window);
    function onKey(event: KeyboardEvent) {
      const pressed = quickKeyPressed(event, superKey.held());
      if (pressed !== null) {
        const topic = blocked ? null : topicForKey(state.topics, pressed);
        if (topic !== null) {
          event.preventDefault();
          void runSwitch(actions.switchTo(topic.id, state));
        }
        return;
      }
      if (event.ctrlKey || event.altKey || event.metaKey) return;
      if (event.key === "Escape") {
        setRowsCorrection(null);
        void dismiss();
        return;
      }
      if (event.key === STOP_KEY) {
        event.preventDefault();
        stop();
        return;
      }
      if (event.key === UNDO_KEY) {
        event.preventDefault();
        undo();
        return;
      }
      if (event.key.toLowerCase() === OPEN_MAIN_KEY) {
        event.preventDefault();
        void openMain();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      superKey.stop();
    };
  }, [state, blocked, actions, runSwitch, dismiss, stop, undo, openMain]);

  // Losing focus dismisses the surface, so the working window keeps it no longer than
  // the interaction takes however the interaction ends. The shortcut's own key grab
  // reports a moment of lost focus as it fires, so focus is read again before acting:
  // a real dismissal is still unfocused a moment later, a grab is not.
  useEffect(() => {
    const subscription = onQuickFocusChanged(async (focused) => {
      // The rows can change while the surface is hidden, for example when a key is set
      // in Topics. The new size then arrives at the old position, so it is placed again.
      if (focused) {
        if (applied.current > 0) await fitQuick(applied.current);
        return;
      }
      await new Promise((resume) => setTimeout(resume, 200));
      if (!(await isQuickFocused())) await dismiss();
    });
    return () => {
      void subscription.then((unlisten) => unlisten());
    };
  }, [dismiss]);

  // The expanded Other topics list must not push the commands off the screen, so the
  // surface is capped to the work area of its monitor, and that list scrolls.
  useEffect(() => {
    let live = true;
    void quickMaxHeight().then((height) => {
      if (live) setMaxHeight(height);
    });
    return () => {
      live = false;
    };
  }, []);

  const elapsed =
    current === null ? null : formatElapsedParts(current.start, now).hm;
  const surfaceError = [error, openMainError]
    .filter((message): message is string => message !== null)
    .join(" ");

  return (
    <div
      className="quick"
      ref={surface}
      style={maxHeight === null ? undefined : { maxHeight: `${maxHeight}px` }}
    >
      {rowsCorrection !== null ? (
        <p className="quick-correction">{rowsCorrection}</p>
      ) : (
        <>
          {assigned.length > 0 && (
            <ol>
              {assigned.map((topic) => (
                <Row
                  key={topic.id}
                  hint={String(topic.quickKey)}
                  label={topic.name}
                  color={topic.color}
                  disabled={blocked}
                  mark={topic.id === activeTopicId ? TOPIC_MARK : ""}
                  trailing={
                    topic.id === activeTopicId && elapsed !== null
                      ? elapsed
                      : ""
                  }
                  onPick={() =>
                    void runSwitch(actions.switchTo(topic.id, state))
                  }
                />
              ))}
            </ol>
          )}
          {!hasTopics && (
            <p className="empty">No topics yet. The window creates them.</p>
          )}
          {hasTopics && assigned.length === 0 && unassigned.length === 0 && (
            <p className="empty">
              Every topic is archived. Restore one in the window.
            </p>
          )}
          {assigned.length === 0 && unassigned.length > 0 && (
            <p className="empty">Set quick keys in Topics</p>
          )}

          {unassigned.length > 0 && (
            <div className="others">
              <button
                type="button"
                className="pick disclosure"
                aria-expanded={othersOpen}
                aria-controls={othersId}
                onClick={() => setOthersOpen((open) => !open)}
              >
                <span className="gap disclosure-mark" aria-hidden="true">
                  {othersOpen ? "▾" : "▸"}
                </span>
                <span className="label">
                  Other topics ({unassigned.length})
                </span>
              </button>
              {othersOpen && (
                <ul id={othersId}>
                  {unassigned.map((topic) => (
                    <Row
                      key={topic.id}
                      hint={null}
                      label={topic.name}
                      color={topic.color}
                      disabled={blocked}
                      mark={topic.id === activeTopicId ? TOPIC_MARK : ""}
                      trailing={
                        topic.id === activeTopicId && elapsed !== null
                          ? elapsed
                          : ""
                      }
                      onPick={() =>
                        void runSwitch(actions.switchTo(topic.id, state))
                      }
                    />
                  ))}
                </ul>
              )}
            </div>
          )}

          <ol className="commands">
            {stopped !== null ? (
              <li className="state">
                <span className="gap" />
                <span className="label">
                  {subjectMark(stopped.subject)}{" "}
                  {subjectLabel(state.topics, stopped.subject)}
                </span>
                <span className="mark" />
                <span className="trailing">{elapsed}</span>
              </li>
            ) : (
              <Row
                hint={STOP_KEY}
                label={`${STOP_MARK} Stop`}
                disabled={busy || current === null}
                onPick={stop}
              />
            )}
            <Row
              hint={UNDO_KEY}
              label={
                current === null
                  ? "Nothing to undo yet"
                  : `Undo last entry (${subjectLabel(state.topics, current.subject)})`
              }
              disabled={busy || current === null}
              onPick={undo}
            />
            <Row
              hint={OPEN_MAIN_KEY.toUpperCase()}
              label="Open Konzendi"
              disabled={busy}
              onPick={() => void openMain()}
            />
          </ol>
        </>
      )}

      {/* Kept mounted for the full feedback period, including while the window is
          hidden after a correction dismisses the surface. */}
      <p className="hidden" role="status">
        {correction.message}
      </p>

      {surfaceError !== "" && <p role="alert">{surfaceError}</p>}
    </div>
  );
}
