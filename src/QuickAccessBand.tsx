import { useEffect, useState } from "react";
import {
  accelerateEvent,
  describeAccelerator,
  formatAccelerator,
} from "./shortcut";
import type { QuickAccess } from "./useQuickAccess";

/**
 * What the window says about quick access. The shortcut is invisible by nature, so the
 * window states which combination is live, and says plainly when it is not: a grab that
 * was refused, or a window system that has no grab to give, must not look like success.
 */

function Capture({
  onPick,
  onCancel,
}: {
  onPick: (accelerator: string) => void;
  onCancel: () => void;
}) {
  const [rejected, setRejected] = useState(false);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      event.preventDefault();
      if (event.key === "Escape") {
        onCancel();
        return;
      }
      const accelerator = accelerateEvent(event);
      if (accelerator === null) {
        // A bare key would be taken from every other application on the desktop.
        setRejected(true);
        return;
      }
      onPick(formatAccelerator(accelerator));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onPick, onCancel]);

  return (
    <span className="capture">
      {rejected
        ? "Hold Ctrl, Alt, Shift or Super and press a key."
        : "Press the combination, or Escape to keep the current one."}
    </span>
  );
}

export function QuickAccessBand({ quick }: { quick: QuickAccess }) {
  const [capturing, setCapturing] = useState(false);
  const { shortcut } = quick;

  const detail =
    shortcut.status === "registering"
      ? "Registering…"
      : shortcut.status === "registered"
        ? `Quick switch ${describeAccelerator(shortcut.accelerator)}`
        : shortcut.status === "unsupported"
          ? `Quick switch is not available on ${shortcut.windowSystem}. Linux needs an X11 session. The tray still works.`
          : `Quick switch ${shortcut.shown} is not active: ${shortcut.detail}.`;

  const failed = shortcut.status === "taken" || shortcut.status === "rejected";
  // Another combination would fare no better where there is no grab to be had.
  const changeable = shortcut.status !== "unsupported";

  return (
    <section className="footer quick-access" data-failed={failed}>
      {capturing ? (
        <Capture
          onPick={(accelerator) => {
            setCapturing(false);
            void quick.setShortcut(accelerator);
          }}
          onCancel={() => setCapturing(false)}
        />
      ) : (
        <>
          <span>
            {detail}
            {/* A window that does not quit when it is closed has to say so — but not
                in place of a failure, which is the more urgent news. */}
            {shortcut.status === "registered" && (
              <span className="aside">
                {" · closing this window leaves Konzendi in the tray"}
              </span>
            )}
          </span>
          {changeable && (
            <button
              type="button"
              className="quiet"
              onClick={() => setCapturing(true)}
            >
              change
            </button>
          )}
        </>
      )}
    </section>
  );
}
