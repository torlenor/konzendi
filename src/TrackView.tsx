import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { AdjustPanel } from "./AdjustPanel";
import {
  type Actions,
  briefCorrectionMessage,
  colorOf,
  nameOf,
  subjectLabel,
  subjectMark,
  TOPIC_MARK,
} from "./actions";
import type { Topic } from "./core/fold";
import { topicChoices, topicForKey } from "./core/topics";
import { quickKeyPressed, watchSuperKey } from "./quickKeys";
import { Swatch } from "./Swatch";
import { formatElapsedParts, formatStamp } from "./time";
import { useCorrectionFeedback } from "./useCorrectionFeedback";
import { type Tracking, useNow } from "./useTracking";

function NewTopic({
  disabled,
  onCreate,
}: {
  disabled: boolean;
  onCreate: (name: string) => void;
}) {
  const [name, setName] = useState("");
  const fieldId = useId();
  return (
    <form
      className="row"
      onSubmit={(event) => {
        event.preventDefault();
        onCreate(name.trim());
        setName("");
      }}
    >
      <label className="hidden" htmlFor={fieldId}>
        Topic name
      </label>
      <input
        id={fieldId}
        value={name}
        // biome-ignore lint/a11y/noAutofocus: the first run screen asks one question.
        autoFocus
        placeholder="What are you working on?"
        onChange={(event) => setName(event.target.value)}
      />
      <button type="submit" disabled={disabled || name.trim() === ""}>
        Start tracking
      </button>
    </form>
  );
}

/** One switch row. A row under Other topics has no key, so it has no key badge. */
function TopicPick({
  topic,
  numbered,
  running,
  disabled,
  onPick,
}: {
  topic: Topic;
  numbered: boolean;
  running: boolean;
  disabled: boolean;
  onPick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        className="pick"
        disabled={disabled}
        aria-current={running || undefined}
        onClick={onPick}
      >
        {numbered ? (
          <span className="key">{topic.quickKey}</span>
        ) : (
          <span className="gap" />
        )}
        <Swatch color={topic.color} />
        <span className="label">{topic.name}</span>
        {/* The running row says so with the mark and the word, never by position
            alone, because it does not leave the list. */}
        {running && (
          <span className="mark">
            {TOPIC_MARK}
            <span className="hidden"> running</span>
          </span>
        )}
      </button>
    </li>
  );
}

export function TrackView({
  tracking,
  actions,
}: {
  tracking: Tracking;
  actions: Actions;
}) {
  const { state, busy } = tracking;
  const now = useNow();
  const [adjusting, setAdjusting] = useState(false);
  const [naming, setNaming] = useState(false);
  const current = state.current;
  const stopped = current?.subject.type === "pause";

  // The topic to resume is the last one tracked before tracking was stopped.
  const resumeTopicId = useMemo(() => {
    if (!stopped) return null;
    for (const interval of [...state.timeline].reverse()) {
      if (interval.subject.type === "topic") return interval.subject.topicId;
    }
    return null;
  }, [stopped, state.timeline]);

  const activeTopicId =
    current?.subject.type === "topic" ? current.subject.topicId : null;
  /**
   * A numbered row carries the key the user gave the topic in Topics, so the key does
   * not move when a topic starts, stops, is renamed, or is added. The running topic
   * stays in its list and is marked; selecting it again is coalesced by the fold.
   */
  const { assigned, unassigned } = useMemo(
    () => topicChoices(state.topics),
    [state.topics],
  );
  const [othersOpen, setOthersOpen] = useState(false);
  const othersId = useId();
  const blocked = busy || tracking.loading;

  const correction = useCorrectionFeedback();
  const pick = useCallback(
    async (topicId: string) => {
      const result = await actions.switchTo(topicId, state);
      if (result.status === "corrected") {
        correction.show(briefCorrectionMessage(state.topics, result.topicId));
      }
    },
    [actions, state, correction],
  );
  const createAndTrack = useCallback(
    async (name: string) => {
      const result = await actions.createAndTrack(name, state);
      if (result.status === "corrected") {
        correction.show(briefCorrectionMessage(state.topics, result.topicId));
      }
    },
    [actions, state, correction],
  );

  // A switch is one key in the focused window: the same keys as the quick switcher.
  useEffect(() => {
    const superKey = watchSuperKey(window);
    function onKey(event: KeyboardEvent) {
      const pressed = quickKeyPressed(event, superKey.held());
      if (pressed === null || blocked) return;
      const topic = topicForKey(state.topics, pressed);
      if (topic === null) return;
      event.preventDefault();
      void pick(topic.id);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      superKey.stop();
    };
  }, [state.topics, pick, blocked]);

  return (
    <>
      {current === null ? (
        <section className="card">
          <p className="lead">Nothing tracked yet.</p>
          <h2>What are you working on?</h2>
          <NewTopic
            disabled={busy}
            onCreate={(name) => void createAndTrack(name)}
          />
        </section>
      ) : (
        // Remounting on a new interval replays the status bar, confirming the record.
        <section className="card" key={current.eventId}>
          <p className="active">
            <span className="mark">{subjectMark(current.subject)}</span>
            <Swatch
              color={colorOf(state.topics, current.subject)}
              blank={current.subject.type !== "topic"}
            />
            <span className="subject">
              {subjectLabel(state.topics, current.subject)}
            </span>
            <span className="elapsed">
              {formatElapsedParts(current.start, now).hm}
              <span className="secs">
                :{formatElapsedParts(current.start, now).ss}
              </span>
            </span>
          </p>
          <p className="since">
            {stopped ? "since" : "started"} {formatStamp(current.start, now)}
            <button
              type="button"
              className="link"
              onClick={() => setAdjusting((open) => !open)}
            >
              adjust
            </button>
          </p>
          {adjusting && (
            <AdjustPanel
              effectiveAt={current.start}
              disabled={busy}
              onRetime={(effectiveAt) => {
                setAdjusting(false);
                void actions.retime(current.eventId, effectiveAt);
              }}
              onClose={() => setAdjusting(false)}
            />
          )}
        </section>
      )}

      <p className="correction-status" role="status">
        {correction.message !== "" && (
          <span key={correction.generation} className="correction-text">
            {correction.message}
          </span>
        )}
      </p>

      <section className="picks">
        {assigned.length > 0 && (
          <ol>
            {assigned.map((topic) => (
              <TopicPick
                key={topic.id}
                topic={topic}
                numbered
                running={topic.id === activeTopicId}
                disabled={busy}
                onPick={() => void pick(topic.id)}
              />
            ))}
          </ol>
        )}
        {assigned.length === 0 && unassigned.length > 0 && (
          <p className="note">Set quick keys in Topics</p>
        )}
        {current !== null &&
          assigned.length === 0 &&
          unassigned.length === 0 && (
            <p className="note">
              Every topic is archived. Restore one in Topics, or add a new
              topic.
            </p>
          )}
        {unassigned.length > 0 && (
          <div className="others">
            <button
              type="button"
              className="disclosure"
              aria-expanded={othersOpen}
              aria-controls={othersId}
              onClick={() => setOthersOpen((open) => !open)}
            >
              <span className="disclosure-mark" aria-hidden="true">
                {othersOpen ? "▾" : "▸"}
              </span>
              Other topics ({unassigned.length})
            </button>
            {othersOpen && (
              <ul id={othersId}>
                {unassigned.map((topic) => (
                  <TopicPick
                    key={topic.id}
                    topic={topic}
                    numbered={false}
                    running={topic.id === activeTopicId}
                    disabled={busy}
                    onPick={() => void pick(topic.id)}
                  />
                ))}
              </ul>
            )}
          </div>
        )}
        {current !== null &&
          (naming ? (
            <NewTopic
              disabled={busy}
              onCreate={(name) => {
                setNaming(false);
                void createAndTrack(name);
              }}
            />
          ) : (
            <button
              type="button"
              className="quiet"
              onClick={() => setNaming(true)}
            >
              + New topic
            </button>
          ))}
      </section>

      {current !== null && (
        <section className="footer">
          <span>
            Last entry {formatStamp(current.start, now)}{" "}
            {subjectLabel(state.topics, current.subject)}
          </span>
          <button
            type="button"
            className="quiet"
            disabled={busy}
            onClick={() => void actions.undo(current.eventId)}
          >
            Undo
          </button>
        </section>
      )}

      <section className="footer">
        {stopped && resumeTopicId !== null ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void pick(resumeTopicId)}
          >
            ▶ Resume {nameOf(state.topics, resumeTopicId)}
          </button>
        ) : (
          !stopped && (
            <button
              type="button"
              disabled={busy || current === null}
              onClick={() => void actions.stop()}
            >
              ■ Stop
            </button>
          )
        )}
      </section>
    </>
  );
}
