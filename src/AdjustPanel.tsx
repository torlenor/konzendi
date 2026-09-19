import { useId, useState } from "react";
import { formatLocalInput, parseLocalInput, shiftMinutes } from "./time";

const steps = [
  {
    label: "−5m",
    minutes: -5,
    accessibleName: "Move start 5 minutes earlier",
  },
  {
    label: "−10m",
    minutes: -10,
    accessibleName: "Move start 10 minutes earlier",
  },
  {
    label: "−15m",
    minutes: -15,
    accessibleName: "Move start 15 minutes earlier",
  },
  {
    label: "−30m",
    minutes: -30,
    accessibleName: "Move start 30 minutes earlier",
  },
  {
    label: "−1h",
    minutes: -60,
    accessibleName: "Move start 1 hour earlier",
  },
];

/** Back-dating an entry, offered wherever an entry is shown. */
export function AdjustPanel({
  effectiveAt,
  disabled,
  onRetime,
  onClose,
}: {
  effectiveAt: string;
  disabled: boolean;
  onRetime: (effectiveAt: string) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState(() => formatLocalInput(effectiveAt));
  const [invalid, setInvalid] = useState(false);
  const fieldId = useId();

  return (
    <div className="panel">
      <div className="row">
        {steps.map(({ label, minutes, accessibleName }) => (
          <button
            key={label}
            type="button"
            className="quiet"
            aria-label={accessibleName}
            disabled={disabled}
            onClick={() => onRetime(shiftMinutes(effectiveAt, minutes))}
          >
            {label}
          </button>
        ))}
      </div>
      <form
        className="row"
        onSubmit={(event) => {
          event.preventDefault();
          const parsed = parseLocalInput(text);
          setInvalid(parsed === null);
          if (parsed !== null) onRetime(parsed);
        }}
      >
        <label htmlFor={fieldId}>Set to</label>
        <input
          id={fieldId}
          value={text}
          placeholder="YYYY-MM-DD HH:MM"
          onChange={(event) => setText(event.target.value)}
        />
        <button type="submit" disabled={disabled}>
          Save
        </button>
        <button type="button" className="quiet" onClick={onClose}>
          Cancel
        </button>
      </form>
      {invalid && (
        <p role="alert">Enter a local date and time as YYYY-MM-DD HH:MM.</p>
      )}
    </div>
  );
}
