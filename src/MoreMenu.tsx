import { getVersion } from "@tauri-apps/api/app";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { openStorageLocation, storageLocation } from "./desktop";
import type { FramePreference } from "./frame";
import type { Appearance } from "./theme";

/**
 * The overflow menu at the end of the bar.
 *
 * It holds the controls a user needs a few times a year: where the data is, how the
 * application looks, and what the running build is. None of them records anything.
 *
 * This is a disclosure, not an ARIA menu. A menu widget owns the arrow keys and needs a
 * roving tabindex; Tab, Enter, and Space already reach four ordinary controls.
 */

/** How long the copy confirmation stays on screen. */
const CONFIRMED = 2500;

type Message = { tone: "note" | "alarm"; text: string };

export function MoreMenu({
  appearance,
  setAppearance,
  frame,
  setFrame,
}: {
  appearance: Appearance;
  setAppearance: (appearance: Appearance) => void;
  frame: FramePreference;
  setFrame: (frame: FramePreference) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [path, setPath] = useState<string | null>(null);
  const [version, setVersion] = useState<string | null>(null);
  const [message, setMessage] = useState<Message | null>(null);
  const panelId = useId();
  const appearanceId = useId();
  const frameId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const close = useCallback((returnFocus: boolean) => {
    setOpen(false);
    setMessage(null);
    if (returnFocus) toggleRef.current?.focus();
  }, []);

  // Read the path and the version once the user asks for them, so a window that never
  // opens the menu calls no command at all.
  useEffect(() => {
    if (!open) return;
    let current = true;
    void storageLocation().then(
      (root) => current && setPath(root),
      (failure) => {
        if (!current) return;
        setPath(null);
        setMessage({
          tone: "alarm",
          text: `Konzendi could not read where its data is: ${String(failure)}`,
        });
      },
    );
    void getVersion().then(
      (reported) => current && setVersion(reported),
      () => current && setVersion(null),
    );
    return () => {
      current = false;
    };
  }, [open]);

  // Escape closes from anywhere inside the panel, and a press outside it closes it too.
  // Focus is left alone: a user moving through the panel with Tab must keep it open.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close(true);
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && rootRef.current?.contains(target)) return;
      close(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open, close]);

  // A confirmation is not a state the user has to dismiss.
  useEffect(() => {
    if (message?.tone !== "note") return;
    const timer = setTimeout(() => setMessage(null), CONFIRMED);
    return () => clearTimeout(timer);
  }, [message]);

  const openFolder = async () => {
    try {
      await openStorageLocation();
      setMessage(null);
    } catch (failure) {
      setMessage({ tone: "alarm", text: String(failure) });
    }
  };

  const copyPath = async () => {
    if (path === null) return;
    try {
      await navigator.clipboard.writeText(path);
      setMessage({ tone: "note", text: "The path is on the clipboard." });
    } catch {
      setMessage({
        tone: "alarm",
        text: "Konzendi could not use the clipboard. Select the path above and copy it.",
      });
    }
  };

  return (
    <div className="more" ref={rootRef}>
      <button
        type="button"
        className="quiet more-toggle"
        ref={toggleRef}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label="More"
        title="More"
        onClick={() => (open ? close(true) : setOpen(true))}
      >
        <span aria-hidden="true">…</span>
      </button>

      {open && (
        // The bar is a drag region, and the panel is not: a press on the path selects it
        // instead of moving the window.
        <div className="more-panel" id={panelId} data-tauri-drag-region="false">
          <section className="more-item">
            <h2>Storage location</h2>
            <p className="more-path">{path ?? "Reading…"}</p>
            <p className="more-note">
              This folder holds your device identity, your recorded entries, and
              a lock file.
            </p>
            <div className="row">
              <button
                type="button"
                className="quiet"
                disabled={path === null}
                onClick={() => void openFolder()}
              >
                Open folder
              </button>
              <button
                type="button"
                className="quiet"
                disabled={path === null}
                onClick={() => void copyPath()}
              >
                Copy path
              </button>
            </div>
            {message && (
              <p
                className="more-note"
                role={message.tone === "alarm" ? "alert" : "status"}
              >
                {message.text}
              </p>
            )}
          </section>

          <div className="more-item row">
            <label htmlFor={appearanceId}>Appearance</label>
            <span className="preference">
              <select
                id={appearanceId}
                value={appearance}
                onChange={(event) =>
                  setAppearance(event.target.value as Appearance)
                }
              >
                <option value="system">System</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </span>
          </div>

          <div className="more-item row">
            <label htmlFor={frameId}>Window frame</label>
            <span className="preference">
              <select
                id={frameId}
                value={frame}
                onChange={(event) =>
                  void setFrame(event.target.value as FramePreference)
                }
              >
                <option value="custom">App frame</option>
                <option value="native">Desktop frame</option>
              </select>
            </span>
          </div>

          <section className="more-item">
            <h2>About</h2>
            <p className="more-note">
              Konzendi {version ?? "(version unavailable)"}
            </p>
            <p className="more-note">
              Released under the MIT license. It includes the Fira Sans and Fira
              Mono fonts under the SIL Open Font License 1.1. The Linux package
              installs the complete third-party notices with its documentation.
            </p>
          </section>
        </div>
      )}
    </div>
  );
}
