import { useId, useMemo, useState } from "react";
import { trackingActions } from "./actions";
import { EntriesView } from "./EntriesView";
import { TopicsView } from "./TopicsView";
import { TrackView } from "./TrackView";
import { type Appearance, useAppearance } from "./theme";
import { useTracking } from "./useTracking";
import "./App.css";

type View = "track" | "entries" | "topics";

function App() {
  const tracking = useTracking();
  const actions = useMemo(
    () => trackingActions(tracking.record),
    [tracking.record],
  );
  const [view, setView] = useState<View>("track");
  const { appearance, setAppearance } = useAppearance();
  const appearanceId = useId();

  // The running state colours the readout, so it is resolved once for the whole window.
  const current = tracking.state.current;
  const trackingState =
    current === null
      ? "idle"
      : current.subject.type === "pause"
        ? "paused"
        : "running";

  return (
    <main data-state={trackingState}>
      <header>
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
        <nav>
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
          <label className="hidden" htmlFor={appearanceId}>
            Appearance
          </label>
          <span className="appearance">
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
        </nav>
      </header>

      {tracking.error && (
        <p role="alert">
          {tracking.error}
          <button
            type="button"
            className="link"
            onClick={tracking.dismissError}
          >
            dismiss
          </button>
        </p>
      )}

      {tracking.loading ? (
        <p>Reading the stored log…</p>
      ) : view === "entries" ? (
        <EntriesView tracking={tracking} actions={actions} />
      ) : view === "topics" ? (
        <TopicsView tracking={tracking} actions={actions} />
      ) : (
        <TrackView tracking={tracking} actions={actions} />
      )}
    </main>
  );
}

export default App;
