import { useCallback, useState } from "react";

/** Appearance is a preference, not tracking data: it never enters the event log. */
export type Appearance = "system" | "light" | "dark";

const KEY = "konzendi.appearance";
const CHOICES: readonly Appearance[] = ["system", "light", "dark"];

const isAppearance = (value: unknown): value is Appearance =>
  CHOICES.includes(value as Appearance);

/** A browser with storage denied still runs; it just forgets the choice. */
function read(): Appearance {
  try {
    const stored = localStorage.getItem(KEY);
    return isAppearance(stored) ? stored : "system";
  } catch {
    return "system";
  }
}

function apply(appearance: Appearance): void {
  const root = document.documentElement;
  if (appearance === "system") delete root.dataset.theme;
  else root.dataset.theme = appearance;
}

// Applied before React renders, so the first paint is already in the chosen mode.
apply(read());

export function useAppearance() {
  const [appearance, setStored] = useState<Appearance>(read);
  const setAppearance = useCallback((next: Appearance) => {
    setStored(next);
    apply(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // A forgotten preference is not worth an error message.
    }
  }, []);
  return { appearance, setAppearance };
}
