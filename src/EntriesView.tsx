import { useId, useState } from "react";
import { AdjustPanel } from "./AdjustPanel";
import { type Actions, colorOf, subjectLabel, subjectMark } from "./actions";
import type { Subject } from "./core/fold";
import { Swatch } from "./Swatch";
import { formatLocalInput, formatStamp, nowIso, parseLocalInput } from "./time";
import { type Tracking, useNow } from "./useTracking";

const STOP = "stop";

function MissedSwitch({
  tracking,
  actions,
  onClose,
}: {
  tracking: Tracking;
  actions: Actions;
  onClose: () => void;
}) {
  const [choice, setChoice] = useState(STOP);
  const [text, setText] = useState(() => formatLocalInput(nowIso()));
  const [invalid, setInvalid] = useState(false);
  const subjectId = useId();
  const timeId = useId();

  return (
    <form
      className="panel"
      onSubmit={(event) => {
        event.preventDefault();
        const effectiveAt = parseLocalInput(text);
        setInvalid(effectiveAt === null);
        if (effectiveAt === null) return;
        const subject: Subject =
          choice === STOP
            ? { type: "pause" }
            : { type: "topic", topicId: choice };
        onClose();
        void actions.addMissed(subject, effectiveAt);
      }}
    >
      <div className="row">
        <label htmlFor={subjectId}>Switched to</label>
        <span className="select-field">
          <select
            id={subjectId}
            value={choice}
            onChange={(event) => setChoice(event.target.value)}
          >
            <option value={STOP}>A stop</option>
            {tracking.state.topics
              .filter((topic) => !topic.archived)
              .map((topic) => (
                <option key={topic.id} value={topic.id}>
                  {topic.name}
                </option>
              ))}
          </select>
        </span>
      </div>
      <div className="row">
        <label htmlFor={timeId}>At</label>
        <input
          id={timeId}
          value={text}
          placeholder="YYYY-MM-DD HH:MM"
          onChange={(event) => setText(event.target.value)}
        />
        <button type="submit" disabled={tracking.busy}>
          Add
        </button>
        <button type="button" className="quiet" onClick={onClose}>
          Cancel
        </button>
      </div>
      {invalid && (
        <p role="alert">Enter a local date and time as YYYY-MM-DD HH:MM.</p>
      )}
    </form>
  );
}

/** Every entry, revoked ones included, newest first. */
export function EntriesView({
  tracking,
  actions,
}: {
  tracking: Tracking;
  actions: Actions;
}) {
  const { state, busy } = tracking;
  const now = useNow(30_000);
  const [adjusting, setAdjusting] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const entries = [...state.entries].reverse();

  return (
    <section>
      <h2>Recent entries</h2>
      {entries.length === 0 && <p>No entries yet.</p>}
      <ol className="entries">
        {entries.map((entry) => (
          <li
            key={entry.id}
            className={entry.revoked ? "entry revoked" : "entry"}
          >
            <div className="row">
              <span className="stamp">
                {formatStamp(entry.effectiveAt, now)}
              </span>
              <span className="mark">{subjectMark(entry.subject)}</span>
              <Swatch color={colorOf(state.topics, entry.subject)} />
              <span className="subject">
                {subjectLabel(state.topics, entry.subject)}
              </span>
              {entry.retimed && <span className="note">corrected</span>}
              {entry.revoked ? (
                <button
                  type="button"
                  className="quiet"
                  disabled={busy}
                  onClick={() => void actions.restore(entry.revokedBy)}
                >
                  restore
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="quiet"
                    onClick={() =>
                      setAdjusting((open) =>
                        open === entry.id ? null : entry.id,
                      )
                    }
                  >
                    adjust
                  </button>
                  <button
                    type="button"
                    className="quiet"
                    disabled={busy}
                    onClick={() => void actions.undo(entry.id)}
                  >
                    undo
                  </button>
                </>
              )}
            </div>
            {adjusting === entry.id && (
              <AdjustPanel
                effectiveAt={entry.effectiveAt}
                disabled={busy}
                onRetime={(effectiveAt) => {
                  setAdjusting(null);
                  void actions.retime(entry.id, effectiveAt);
                }}
                onClose={() => setAdjusting(null)}
              />
            )}
          </li>
        ))}
      </ol>
      {adding ? (
        <MissedSwitch
          tracking={tracking}
          actions={actions}
          onClose={() => setAdding(false)}
        />
      ) : (
        <button type="button" className="quiet" onClick={() => setAdding(true)}>
          + Add a missed switch
        </button>
      )}
      <p className="note">
        {state.timeline.length} interval{state.timeline.length === 1 ? "" : "s"}{" "}
        in the timeline. Nothing here edits the log; every change appends an
        event.
      </p>
    </section>
  );
}
