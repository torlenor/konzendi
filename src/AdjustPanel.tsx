import { useId, useState } from "react";
import { formatLocalInput, parseLocalInput, shiftMinutes } from "./time";

const steps: [string, number][] = [
  ["−15m", -15],
  ["−30m", -30],
  ["−1h", -60],
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
        {steps.map(([label, minutes]) => (
          <button
            key={label}
            type="button"
            className="quiet"
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
