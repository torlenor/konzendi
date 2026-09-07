import { useId, useState } from "react";
import type { Actions } from "./actions";
import type { Topic } from "./core/fold";
import type { Tracking } from "./useTracking";

function Rename({
  topic,
  disabled,
  onRename,
  onClose,
}: {
  topic: Topic;
  disabled: boolean;
  onRename: (name: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(topic.name);
  const fieldId = useId();
  return (
    <form
      className="row"
      onSubmit={(event) => {
        event.preventDefault();
        onRename(name.trim());
      }}
    >
      <label className="hidden" htmlFor={fieldId}>
        New name for {topic.name}
      </label>
      <input
        id={fieldId}
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <button type="submit" disabled={disabled || name.trim() === ""}>
        Save
      </button>
      <button type="button" className="quiet" onClick={onClose}>
        Cancel
      </button>
    </form>
  );
}

/** Renaming and archiving. History keeps the id, so both are safe at any time. */
export function TopicsView({
  tracking,
  actions,
}: {
  tracking: Tracking;
  actions: Actions;
}) {
  const { state, busy } = tracking;
  const [renaming, setRenaming] = useState<string | null>(null);

  return (
    <section>
      <h2>Topics</h2>
      {state.topics.length === 0 && <p>No topics yet.</p>}
      <ol className="entries">
        {state.topics.map((topic) => (
          <li
            key={topic.id}
            className={topic.archived ? "entry faded" : "entry"}
          >
            {renaming === topic.id ? (
              <Rename
                topic={topic}
                disabled={busy}
                onRename={(name) => {
                  setRenaming(null);
                  void actions.rename(topic.id, name);
                }}
                onClose={() => setRenaming(null)}
              />
            ) : (
              <div className="row">
                <span className="subject">{topic.name}</span>
                {topic.archived && <span className="note">archived</span>}
                <button
                  type="button"
                  className="quiet"
                  onClick={() => setRenaming(topic.id)}
                >
                  rename
                </button>
                <button
                  type="button"
                  className="quiet"
                  disabled={busy}
                  onClick={() =>
                    void (topic.archived
                      ? actions.unarchive(topic.id)
                      : actions.archive(topic.id))
                  }
                >
                  {topic.archived ? "restore" : "archive"}
                </button>
              </div>
            )}
          </li>
        ))}
      </ol>
      <p className="note">
        Archiving removes a topic from the pick lists and keeps its history.
      </p>
    </section>
  );
}
