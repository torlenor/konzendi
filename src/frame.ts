import { getCurrentWindow } from "@tauri-apps/api/window";
import { useCallback, useState } from "react";

/** The frame is a local presentation preference and never enters the event log. */
export type FramePreference = "custom" | "native";

const KEY = "konzendi.frame";
const CHOICES: readonly FramePreference[] = ["custom", "native"];

const isFramePreference = (value: unknown): value is FramePreference =>
  CHOICES.includes(value as FramePreference);

/** A webview without storage still starts with the application frame. */
export function readFramePreference(
  storage: Pick<Storage, "getItem">,
): FramePreference {
  try {
    const stored = storage.getItem(KEY);
    return isFramePreference(stored) ? stored : "custom";
  } catch {
    return "custom";
  }
}

function apply(frame: FramePreference): void {
  document.documentElement.dataset.frame = frame;
}

let prepared: FramePreference = "custom";

/** Apply the saved choice while the main window is still hidden. */
export async function prepareInitialFrame(): Promise<void> {
  prepared = readFramePreference(localStorage);
  apply(prepared);
  try {
    await getCurrentWindow().setDecorations(prepared === "native");
  } catch {
    prepared = "custom";
    apply(prepared);
  }
}

/** Show only after the frame choice and the first React tree are ready. */
export async function showInitialMainWindow(): Promise<void> {
  await document.fonts.ready;
  await getCurrentWindow().show();
}

export function useFramePreference() {
  const [frame, setApplied] = useState<FramePreference>(prepared);

  const setFrame = useCallback(
    async (next: FramePreference) => {
      try {
        await getCurrentWindow().setDecorations(next === "native");
        prepared = next;
        apply(next);
        setApplied(next);
        try {
          localStorage.setItem(KEY, next);
        } catch {
          // A forgotten preference does not stop the window from working.
        }
      } catch {
        apply(frame);
      }
    },
    [frame],
  );

  return { frame, setFrame };
}
