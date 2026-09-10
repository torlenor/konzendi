import { register, unregister } from "@tauri-apps/plugin-global-shortcut";
import { useCallback, useEffect, useState } from "react";
import { toggleQuick, windowSystem } from "./desktop";
import {
  type Accelerator,
  describeAccelerator,
  formatAccelerator,
  parseAccelerator,
  readShortcut,
  writeShortcut,
} from "./shortcut";

/**
 * The global shortcut, owned by the tracking window because its webview lives as long
 * as the application does.
 *
 * Registration is never assumed to have worked. The combination can be held by another
 * application, and on a window system that is not X11 the grab cannot exist at all, so
 * the state below is reported on screen instead of being taken on trust.
 */

export type ShortcutState =
  | { status: "registering" }
  | { status: "registered"; accelerator: Accelerator; shown: string }
  | { status: "taken"; shown: string; detail: string }
  | { status: "rejected"; shown: string; detail: string }
  | { status: "unsupported"; shown: string; windowSystem: string };

export interface QuickAccess {
  shortcut: ShortcutState;
  /** Choose the combination. It is remembered whether or not the grab succeeds, so a
   * combination another application holds can be reported and then changed again. */
  setShortcut: (text: string) => void;
}

function taken(failure: unknown): boolean {
  return /already registered/i.test(String(failure));
}

/**
 * Grabs are process-wide, so overlapping calls would fight: a re-render that releases
 * one combination while another is being taken can otherwise report a conflict with
 * itself. Every call the hook makes goes through this one queue instead.
 */
let queue: Promise<unknown> = Promise.resolve();

function serially<T>(task: () => Promise<T>): Promise<T> {
  const next = queue.then(task, task);
  queue = next.catch(() => undefined);
  return next;
}

/** Take the combination, releasing a grab this application already holds on it. */
function grab(canonical: string, onPressed: () => void): Promise<void> {
  return serially(async () => {
    await unregister(canonical).catch(() => undefined);
    // The grab reports the release as well; one press is one toggle.
    await register(canonical, (event) => {
      if (event.state === "Pressed") onPressed();
    });
  });
}

function release(canonical: string): Promise<void> {
  return serially(() => unregister(canonical).catch(() => undefined));
}

export function useQuickAccess(): QuickAccess {
  const [shortcut, setShortcut] = useState<ShortcutState>({
    status: "registering",
  });
  const [wanted, setWanted] = useState<string>(readShortcut);

  useEffect(() => {
    const accelerator = parseAccelerator(wanted);
    const shown =
      accelerator === null ? wanted : describeAccelerator(accelerator);
    if (accelerator === null) {
      setShortcut({
        status: "rejected",
        shown,
        detail: "that is not a combination this build can register",
      });
      return;
    }

    // A run that has been replaced still has to release its grab, and must not report
    // a state the run replacing it has moved past.
    const canonical = formatAccelerator(accelerator);
    let live = true;
    setShortcut({ status: "registering" });

    void (async () => {
      const system = await windowSystem();
      if (!live) return;
      if (system !== "x11") {
        // The grab is an X11 grab. Saying so beats a shortcut that never fires.
        setShortcut({ status: "unsupported", shown, windowSystem: system });
        return;
      }
      try {
        await grab(canonical, () => void toggleQuick());
      } catch (failure) {
        if (!live) return;
        setShortcut(
          taken(failure)
            ? {
                status: "taken",
                shown,
                detail: "another application already holds it",
              }
            : { status: "rejected", shown, detail: String(failure) },
        );
        return;
      }
      if (live) setShortcut({ status: "registered", accelerator, shown });
    })();

    return () => {
      live = false;
      void release(canonical);
    };
  }, [wanted]);

  return {
    shortcut,
    setShortcut: useCallback((text: string) => {
      writeShortcut(text);
      setWanted(text);
    }, []),
  };
}
