import { useCallback, useEffect, useRef, useState } from "react";

const FEEDBACK_MS = 3000;

/**
 * A correction message that clears itself after a fixed period, replacing any earlier
 * one so a rapid second correction restarts the period instead of stacking a message.
 */
export function useCorrectionFeedback(durationMs = FEEDBACK_MS) {
  const [message, setMessage] = useState("");
  const [generation, setGeneration] = useState(0);
  const timer = useRef<number | null>(null);
  const latest = useRef(0);

  const show = useCallback(
    (text: string) => {
      latest.current += 1;
      const id = latest.current;
      setMessage(text);
      setGeneration(id);
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        if (latest.current === id) setMessage("");
      }, durationMs);
    },
    [durationMs],
  );

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  // `generation` changes on every `show`, even a repeated message, so a surface that
  // keys an element on it retriggers a CSS animation the plain text would not.
  return { message, generation, show };
}
