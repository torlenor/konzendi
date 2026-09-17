import { useId, useRef, useState } from "react";
import type { Actions } from "./actions";
import type { Topic } from "./core/fold";
import { keyOwner } from "./core/topics";
import { isQuickKey, type QuickKey } from "./core/tracking";
import { Swatch } from "./Swatch";
import {
  contrastByMode,
  parseHexColor,
  SUGGESTED_COLORS,
  topicColorStyle,
  weakModes,
} from "./topicColor";
import type { Tracking } from "./useTracking";

const KEYS: readonly QuickKey[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const NONE = "none";

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

/** Another topic that holds the key now, or null when the key is free or already ours. */
function otherOwner(
  topics: readonly Topic[],
  topic: Topic,
  key: QuickKey | null,
): Topic | null {
  if (key === null) return null;
  const owner = keyOwner(topics, key);
  return owner !== null && owner.id !== topic.id ? owner : null;
}

function KeyEditor({
  topic,
  topics,
  disabled,
  onSave,
  onClose,
}: {
  topic: Topic;
  topics: readonly Topic[];
  disabled: boolean;
  onSave: (key: QuickKey | null) => Promise<boolean>;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<QuickKey | null>(topic.quickKey);
  // The owner the user was shown when they chose the key. Another window can move the
  // key before the user confirms; then the user must confirm the new owner.
  const [shownOwnerId, setShownOwnerId] = useState<string | null>(null);
  const [changed, setChanged] = useState(false);
  const fieldId = useId();
  const owner = otherOwner(topics, topic, draft);

  return (
    <form
      className="panel"
      onSubmit={async (event) => {
        event.preventDefault();
        if (draft === topic.quickKey) {
          onClose();
          return;
        }
        if ((owner?.id ?? null) !== shownOwnerId) {
          setShownOwnerId(owner?.id ?? null);
          setChanged(true);
          return;
        }
        // Nothing is shown as saved until the store confirms it.
        if (await onSave(draft)) onClose();
      }}
    >
      <div className="row">
        <label htmlFor={fieldId}>Quick key</label>
        <span className="select-field">
          <select
            id={fieldId}
            value={draft ?? NONE}
            onChange={(event) => {
              const value = Number(event.target.value);
              const next = isQuickKey(value) ? value : null;
              setDraft(next);
              setShownOwnerId(otherOwner(topics, topic, next)?.id ?? null);
              setChanged(false);
            }}
          >
            <option value={NONE}>None</option>
            {KEYS.map((key) => {
              const holder = otherOwner(topics, topic, key);
              return (
                <option key={key} value={key}>
                  {holder === null ? key : `${key} — used by ${holder.name}`}
                </option>
              );
            })}
          </select>
        </span>
        {owner === null && (
          <button type="submit" disabled={disabled}>
            Save
          </button>
        )}
        <button type="button" className="quiet" onClick={onClose}>
          Cancel
        </button>
      </div>
      {changed && (
        <p className="note" role="status">
          {owner === null
            ? `Key ${draft} is free now. Save to give it to ${topic.name}.`
            : `Key ${draft} now belongs to ${owner.name}. Check the move again.`}
        </p>
      )}
      {owner !== null && (
        <div className="row">
          <button type="submit" disabled={disabled}>
            Move key {draft} from {owner.name} to {topic.name}
          </button>
        </div>
      )}
    </form>
  );
}

function ratio(value: number): string {
  return `${value.toFixed(1)}:1`;
}

function ColorEditor({
  topic,
  disabled,
  onSave,
  onClose,
}: {
  topic: Topic;
  disabled: boolean;
  onSave: (color: string | null) => Promise<boolean>;
  onClose: () => void;
}) {
  const [text, setText] = useState(topic.color ?? "");
  const pickerId = useId();
  const fieldId = useId();
  const blank = text.trim() === "";
  const draft = blank ? null : parseHexColor(text);
  const invalid = !blank && draft === null;
  const weak = draft === null ? [] : weakModes(draft);
  const ratios = draft === null ? null : contrastByMode(draft);

  return (
    <form
      className="panel"
      onSubmit={async (event) => {
        event.preventDefault();
        if (invalid) return;
        if (draft === topic.color) {
          onClose();
          return;
        }
        if (await onSave(draft)) onClose();
      }}
    >
      <div className="row">
        <label htmlFor={pickerId}>Color</label>
        <input
          id={pickerId}
          type="color"
          className="color-picker"
          value={draft ?? "#808080"}
          onChange={(event) => setText(event.target.value)}
        />
        <label className="hidden" htmlFor={fieldId}>
          Color as a hexadecimal value
        </label>
        <input
          id={fieldId}
          className="color-hex"
          value={text}
          placeholder="#rrggbb"
          spellCheck={false}
          aria-invalid={invalid || undefined}
          onChange={(event) => setText(event.target.value)}
        />
        <span
          className={draft === null ? "swatch-preview empty" : "swatch-preview"}
          aria-hidden="true"
          style={topicColorStyle(draft)}
        />
      </div>
      <fieldset className="row swatch-choices">
        <legend className="hidden">Suggested colors</legend>
        {SUGGESTED_COLORS.map((suggestion) => (
          <button
            key={suggestion.color}
            type="button"
            className="swatch-choice"
            aria-label={suggestion.name}
            aria-pressed={draft === suggestion.color}
            title={suggestion.name}
            style={topicColorStyle(suggestion.color)}
            onClick={() => setText(suggestion.color)}
          />
        ))}
        <button
          type="button"
          className="quiet"
          aria-pressed={draft === null && !invalid}
          onClick={() => setText("")}
        >
          None
        </button>
      </fieldset>
      {invalid && (
        <p role="alert">Enter a color as # and six hexadecimal digits.</p>
      )}
      {weak.length > 0 && ratios !== null && (
        <p className="note" role="status">
          {weak.length === 2
            ? `This color is hard to see in the light theme (${ratio(ratios.light)}) and in the dark theme (${ratio(ratios.dark)}).`
            : `This color is hard to see in the ${weak[0]} theme (${ratio(ratios[weak[0]])}).`}{" "}
          An outline keeps it visible, but it is harder to tell apart, and so is
          a hatched stretch in Analytics. You can still save it.
        </p>
      )}
      <div className="row">
        <button type="submit" disabled={disabled || invalid}>
          Save
        </button>
        <button type="button" className="quiet" onClick={onClose}>
          Cancel
        </button>
      </div>
    </form>
  );
}

/** Adds a topic without tracking it. The field keeps the focus for the next name. */
function AddTopic({
  disabled,
  onCreate,
}: {
  disabled: boolean;
  onCreate: (name: string) => Promise<boolean>;
}) {
  const [name, setName] = useState("");
  const field = useRef<HTMLInputElement>(null);
  const fieldId = useId();
  const trimmed = name.trim();
  return (
    <form
      className="row"
      onSubmit={async (event) => {
        event.preventDefault();
        if (disabled || trimmed === "") return;
        // Nothing is shown as saved until the store confirms it.
        if (await onCreate(trimmed)) setName("");
        field.current?.focus();
      }}
    >
      <label className="hidden" htmlFor={fieldId}>
        New topic name
      </label>
      <input
        id={fieldId}
        ref={field}
        value={name}
        placeholder="New topic name"
        onChange={(event) => setName(event.target.value)}
      />
      <button type="submit" disabled={disabled || trimmed === ""}>
        Add topic
      </button>
    </form>
  );
}

type Editing = { topicId: string; part: "name" | "key" | "color" } | null;

/**
 * Adding, renaming, quick keys, colors, and archiving. History keeps the topic id, so each of
 * them is safe at any time.
 */
export function TopicsView({
  tracking,
  actions,
}: {
  tracking: Tracking;
  actions: Actions;
}) {
  const { state, busy } = tracking;
  const [editing, setEditing] = useState<Editing>(null);
  const archiveNoteId = useId();
  const close = () => setEditing(null);
  const open = (topicId: string, part: "name" | "key" | "color") =>
    setEditing((current) =>
      current?.topicId === topicId && current.part === part
        ? null
        : { topicId, part },
    );

  return (
    <section>
      <h2>Topics</h2>
      <AddTopic disabled={busy} onCreate={actions.create} />
      {state.topics.length === 0 && <p>No topics yet.</p>}
      <ol className="entries">
        {state.topics.map((topic) => {
          const part = editing?.topicId === topic.id ? editing.part : null;
          return (
            <li
              key={topic.id}
              className={topic.archived ? "entry faded" : "entry"}
            >
              {part === "name" ? (
                <Rename
                  topic={topic}
                  disabled={busy}
                  onRename={(name) => {
                    close();
                    void actions.rename(topic.id, name);
                  }}
                  onClose={close}
                />
              ) : (
                <div className="row">
                  <span className="key">
                    {topic.quickKey !== null && (
                      <>
                        <span className="hidden">Quick key </span>
                        {topic.quickKey}
                      </>
                    )}
                  </span>
                  <Swatch color={topic.color} />
                  <span className="subject">{topic.name}</span>
                  {topic.archived && <span className="note">archived</span>}
                  <button
                    type="button"
                    className="quiet"
                    onClick={() => open(topic.id, "name")}
                  >
                    rename
                  </button>
                  {!topic.archived && (
                    <>
                      <button
                        type="button"
                        className="quiet"
                        aria-expanded={part === "key"}
                        onClick={() => open(topic.id, "key")}
                      >
                        quick key
                      </button>
                      <button
                        type="button"
                        className="quiet"
                        aria-expanded={part === "color"}
                        onClick={() => open(topic.id, "color")}
                      >
                        color
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    className="quiet"
                    disabled={busy}
                    aria-describedby={archiveNoteId}
                    onClick={() => {
                      if (!topic.archived && part !== null) close();
                      void (topic.archived
                        ? actions.unarchive(topic.id)
                        : actions.archive(topic.id));
                    }}
                  >
                    {topic.archived ? "restore" : "archive"}
                  </button>
                </div>
              )}
              {part === "key" && !topic.archived && (
                <KeyEditor
                  topic={topic}
                  topics={state.topics}
                  disabled={busy}
                  onSave={(key) => actions.setQuickKey(topic.id, key)}
                  onClose={close}
                />
              )}
              {part === "color" && !topic.archived && (
                <ColorEditor
                  topic={topic}
                  disabled={busy}
                  onSave={(color) => actions.setColor(topic.id, color)}
                  onClose={close}
                />
              )}
            </li>
          );
        })}
      </ol>
      <p className="note" id={archiveNoteId}>
        Archiving removes a topic from the switch lists and frees its quick key.
        Restoring it does not give the key back. The topic keeps its history and
        its color.
      </p>
      <p className="note">
        A quick key from 1 to 9 selects the topic in the tracking window and in
        quick access. Topics without a key are under Other topics.
      </p>
    </section>
  );
}
