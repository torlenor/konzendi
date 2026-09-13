import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type Actions,
  STOP_MARK,
  subjectLabel,
  subjectMark,
  TOPIC_MARK,
  trackingActions,
} from "./actions";
import {
  fitQuick,
  hideQuick,
  isQuickFocused,
  onQuickFocusChanged,
  showMain,
} from "./desktop";
import { formatElapsedParts } from "./time";
import { type Tracking, useNow, useTracking } from "./useTracking";
import "./App.css";

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
  mark,
  trailing,
  disabled,
  onPick,
}: {
  hint: string;
  label: string;
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
        <span className="key">{hint}</span>
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
   * Every topic keeps its number, the active one included: the number is muscle memory
   * and must not move because a topic happens to be running. Selecting the active topic
   * is coalesced by the fold, so that row is harmless as well as stable.
   */
  const choices = useMemo(
    () => state.topics.filter((topic) => !topic.archived).slice(0, 9),
    [state.topics],
  );

  // Nothing counts as recorded until the store confirms it, so the surface closes on the
  // confirmation and stays open, with the reason, when the append failed.
  const run = useCallback(async (appending: Promise<boolean>) => {
    if (await appending) await hideQuick();
  }, []);

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
    function onKey(event: KeyboardEvent) {
      if (event.ctrlKey || event.altKey || event.metaKey) return;
      if (event.key === "Escape") {
        void hideQuick();
        return;
      }
      const index = Number(event.key) - 1;
      if (Number.isInteger(index) && index >= 0 && index < choices.length) {
        event.preventDefault();
        void run(actions.switchTo(choices[index].id));
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
    return () => window.removeEventListener("keydown", onKey);
  }, [choices, actions, run, stop, undo, openMain]);

  // Losing focus dismisses the surface, so the working window keeps it no longer than
  // the interaction takes however the interaction ends. The shortcut's own key grab
  // reports a moment of lost focus as it fires, so focus is read again before acting:
  // a real dismissal is still unfocused a moment later, a grab is not.
  useEffect(() => {
    const subscription = onQuickFocusChanged(async (focused) => {
      if (focused) return;
      await new Promise((resume) => setTimeout(resume, 200));
      if (!(await isQuickFocused())) await hideQuick();
    });
    return () => {
      void subscription.then((unlisten) => unlisten());
    };
  }, []);

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

  const elapsed =
    current === null ? null : formatElapsedParts(current.start, now).hm;
  const surfaceError = [error, openMainError]
    .filter((message): message is string => message !== null)
    .join(" ");

  return (
    <div className="quick" ref={surface}>
      <ol>
        {choices.map((topic, index) => (
          <Row
            key={topic.id}
            hint={String(index + 1)}
            label={topic.name}
            disabled={busy}
            mark={topic.id === activeTopicId ? TOPIC_MARK : ""}
            trailing={
              topic.id === activeTopicId && elapsed !== null ? elapsed : ""
            }
            onPick={() => void run(actions.switchTo(topic.id))}
          />
        ))}
        {choices.length === 0 && (
          <li className="empty">No topics yet. The window creates them.</li>
        )}
      </ol>

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

      {surfaceError !== "" && <p role="alert">{surfaceError}</p>}
    </div>
  );
}
