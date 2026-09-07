import { useEffect, useId, useMemo, useState } from "react";
import { AdjustPanel } from "./AdjustPanel";
import { type Actions, nameOf, subjectLabel, subjectMark } from "./actions";
import { formatElapsedParts, formatStamp } from "./time";
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
  const paused = current?.subject.type === "pause";

  // The topic to resume is the last one tracked before the running pause.
  const resumeTopicId = useMemo(() => {
    if (!paused) return null;
    for (const interval of [...state.timeline].reverse()) {
      if (interval.subject.type === "topic") return interval.subject.topicId;
    }
    return null;
  }, [paused, state.timeline]);

  const activeTopicId =
    current?.subject.type === "topic" ? current.subject.topicId : null;
  const choices = useMemo(
    () =>
      state.topics.filter(
        (topic) =>
          !topic.archived &&
          topic.id !== activeTopicId &&
          topic.id !== resumeTopicId,
      ),
    [state.topics, activeTopicId, resumeTopicId],
  );

  // A switch is one key in the focused window; the same numbers Phase 3 will reuse.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.ctrlKey || event.altKey || event.metaKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;
      const index = Number(event.key) - 1;
      if (Number.isInteger(index) && index >= 0 && index < choices.length) {
        event.preventDefault();
        void actions.switchTo(choices[index].id);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [choices, actions]);

  return (
    <>
      {current === null ? (
        <section className="card">
          <p className="lead">Nothing tracked yet.</p>
          <h2>What are you working on?</h2>
          <NewTopic disabled={busy} onCreate={actions.createAndTrack} />
        </section>
      ) : (
        // Remounting on a new interval replays the status bar, confirming the record.
        <section className="card" key={current.eventId}>
          <p className="active">
            <span className="mark">{subjectMark(current.subject)}</span>
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
            {paused ? "since" : "started"} {formatStamp(current.start, now)}
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

      <section className="picks">
        <ol>
          {choices.map((topic, index) => (
            <li key={topic.id}>
              <button
                type="button"
                className="pick"
                disabled={busy}
                onClick={() => void actions.switchTo(topic.id)}
              >
                <span className="key">{index < 9 ? index + 1 : ""}</span>
                {topic.name}
              </button>
            </li>
          ))}
        </ol>
        {current !== null &&
          (naming ? (
            <NewTopic
              disabled={busy}
              onCreate={(name) => {
                setNaming(false);
                void actions.createAndTrack(name);
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
        {paused && resumeTopicId !== null ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void actions.switchTo(resumeTopicId)}
          >
            ▶ Resume {nameOf(state.topics, resumeTopicId)}
          </button>
        ) : (
          !paused && (
            <button
              type="button"
              disabled={busy || current === null}
              onClick={() => void actions.pause()}
            >
              ❙❙ Pause
            </button>
          )
        )}
      </section>
    </>
  );
}
