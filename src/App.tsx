import { useMemo, useState } from "react";
import { trackingActions } from "./actions";
import { EntriesView } from "./EntriesView";
import { TopicsView } from "./TopicsView";
import { TrackView } from "./TrackView";
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

  return (
    <main>
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
