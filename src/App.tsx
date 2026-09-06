import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { type EventRecord, mergeEvents } from "./core/events";
import "./App.css";

async function loadEvents() {
  return mergeEvents(await invoke<EventRecord[]>("read_events"));
}

function App() {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadEvents()
      .then(setEvents)
      .catch((error: unknown) => setError(String(error)))
      .finally(() => setBusy(false));
  }, []);

  async function appendPlaceholder() {
    setBusy(true);
    setError(null);
    try {
      await invoke<EventRecord>("append_event", {
        kind: "foundation.check",
        payload: {},
      });
      setEvents(await loadEvents());
    } catch (error) {
      setError(
        `Could not complete the round-trip: ${String(error)}. A write may already have succeeded; restart to check before retrying.`,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <p className="eyebrow">Repository foundation</p>
      <h1>Konzendi</h1>
      <p>
        Check that a placeholder event is saved on this device and survives a
        restart.
      </p>
      <button type="button" disabled={busy} onClick={appendPlaceholder}>
        {busy ? "Loading…" : "Write test event"}
      </button>
      {error && <p role="alert">{error}</p>}
      <h2>
        Stored events <span>({events.length})</span>
      </h2>
      {!busy && events.length === 0 && <p>No events yet.</p>}
      <ol aria-label="Stored events">
        {events.map((event) => (
          <li key={event.id}>
            <pre>{JSON.stringify(event, null, 2)}</pre>
          </li>
        ))}
      </ol>
    </main>
  );
}

export default App;
