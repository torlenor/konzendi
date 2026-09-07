import { invoke } from "@tauri-apps/api/core";
import type { EventRecord } from "./core/events";
import type { EventDraft } from "./core/tracking";

/** The only place the interface talks to the Rust store. */

export function readLog(): Promise<EventRecord[]> {
  return invoke<EventRecord[]>("read_events");
}

export function appendEvent(draft: EventDraft): Promise<EventRecord> {
  return invoke<EventRecord>("append_event", {
    kind: draft.kind,
    payload: draft.payload,
  });
}
