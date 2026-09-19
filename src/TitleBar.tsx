import { closeWindowToTray, minimizeWindow } from "./desktop";
import type { FramePreference } from "./frame";
import { MoreMenu } from "./MoreMenu";
import type { Appearance } from "./theme";

type View = "track" | "analytics" | "entries" | "topics";

function WindowControls({
  maximized,
  toggleMaximized,
}: {
  maximized: boolean;
  toggleMaximized: () => Promise<void>;
}) {
  return (
    <div className="window-controls">
      <button
        type="button"
        className="window-control"
        aria-label="Minimise window"
        title="Minimise"
        onClick={() => void minimizeWindow()}
      >
        <span aria-hidden="true">−</span>
      </button>
      <button
        type="button"
        className="window-control"
        aria-label={maximized ? "Restore window" : "Maximise window"}
        title={maximized ? "Restore" : "Maximise"}
        onClick={() => void toggleMaximized()}
      >
        <span
          aria-hidden="true"
          className="maximize-icon"
          data-restoring={maximized}
        />
      </button>
      <button
        type="button"
        className="window-control close"
        aria-label="Close window to tray"
        title="Close to tray"
        onClick={() => void closeWindowToTray()}
      >
        <span aria-hidden="true">×</span>
      </button>
    </div>
  );
}

export function TitleBar({
  view,
  setView,
  appearance,
  setAppearance,
  frame,
  setFrame,
  maximized,
  toggleMaximized,
}: {
  view: View;
  setView: (view: View) => void;
  appearance: Appearance;
  setAppearance: (appearance: Appearance) => void;
  frame: FramePreference;
  setFrame: (frame: FramePreference) => Promise<void>;
  maximized: boolean;
  toggleMaximized: () => Promise<void>;
}) {
  return (
    <header
      className="title-bar"
      data-tauri-drag-region={frame === "custom" ? "deep" : undefined}
    >
      <div className="title-bar-identity">
        {view === "track" ? (
          <h1>Konzendi</h1>
        ) : (
          <button
            type="button"
            className="quiet"
            onClick={() => setView("track")}
          >
            ‹ Back
          </button>
        )}
      </div>
      <nav aria-label="Application">
        <button
          type="button"
          className="quiet"
          onClick={() => setView("analytics")}
        >
          Analytics
        </button>
        <button
          type="button"
          className="quiet"
          onClick={() => setView("entries")}
        >
          Entries
        </button>
        <button
          type="button"
          className="quiet"
          onClick={() => setView("topics")}
        >
          Topics
        </button>
        <MoreMenu
          appearance={appearance}
          setAppearance={setAppearance}
          frame={frame}
          setFrame={setFrame}
        />
      </nav>
      {frame === "custom" && (
        <WindowControls
          maximized={maximized}
          toggleMaximized={toggleMaximized}
        />
      )}
    </header>
  );
}
