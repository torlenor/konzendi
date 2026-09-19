import { useEffect, useMemo, useState } from "react";
import { AnalyticsView } from "./AnalyticsView";
import { trackingActions } from "./actions";
import { showMain } from "./desktop";
import { EntriesView } from "./EntriesView";
import { useFramePreference } from "./frame";
import { QuickAccessBand } from "./QuickAccessBand";
import { ResizeEdges } from "./ResizeEdges";
import { TitleBar } from "./TitleBar";
import { TopicsView } from "./TopicsView";
import { TrackView } from "./TrackView";
import { useAppearance } from "./theme";
import { useQuickAccess } from "./useQuickAccess";
import { useTracking } from "./useTracking";
import { useTray } from "./useTray";
import { useWindowMaximized } from "./useWindowMaximized";
import "./App.css";

type View = "track" | "analytics" | "entries" | "topics";

function App() {
  const tracking = useTracking();
  const actions = useMemo(
    () => trackingActions(tracking.record),
    [tracking.record],
  );
  const [view, setView] = useState<View>("track");
  // Quick access belongs to this window because its webview outlives every other one.
  const quick = useQuickAccess();
  useTray(tracking, actions);
  const { appearance, setAppearance } = useAppearance();
  const { frame, setFrame } = useFramePreference();
  const { maximized, toggleMaximized } = useWindowMaximized();

  // A tray action can fail while the tracking window is hidden. Bring the warning into
  // view so a failed write never looks like a successful background action.
  useEffect(() => {
    if (tracking.error !== null) {
      void showMain().catch((failure) =>
        console.error(`Could not show the storage warning: ${String(failure)}`),
      );
    }
  }, [tracking.error]);

  // The running state colours the readout, so it is resolved once for the whole window.
  const current = tracking.state.current;
  const trackingState =
    current === null
      ? "idle"
      : current.subject.type === "pause"
        ? "stopped"
        : "running";

  return (
    <main data-state={trackingState}>
      <TitleBar
        view={view}
        setView={setView}
        appearance={appearance}
        setAppearance={setAppearance}
        frame={frame}
        setFrame={setFrame}
        maximized={maximized}
        toggleMaximized={toggleMaximized}
      />

      {/* A maximised window does not resize from its edges, so the zones go away. */}
      {frame === "custom" && !maximized && <ResizeEdges />}

      {/* The bar stays in place: only this area scrolls when the content is taller. */}
      <div className="app-scroll">
        <div className="app-content">
          {tracking.error && (
            <section className="storage-alert" role="alert">
              <strong>Konzendi cannot safely store your data</strong>
              <span>{tracking.error}</span>
            </section>
          )}

          {tracking.loading ? (
            <p>Reading the stored log…</p>
          ) : view === "analytics" ? (
            <AnalyticsView
              tracking={tracking}
              openEntries={() => setView("entries")}
            />
          ) : view === "entries" ? (
            <EntriesView tracking={tracking} actions={actions} />
          ) : view === "topics" ? (
            <TopicsView tracking={tracking} actions={actions} />
          ) : (
            <>
              <TrackView tracking={tracking} actions={actions} />
              <QuickAccessBand quick={quick} />
            </>
          )}
        </div>
      </div>
    </main>
  );
}

export default App;
