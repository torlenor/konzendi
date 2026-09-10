import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
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

/**
 * Every record the store writes, broadcast to every window. Two windows fold the same
 * log, so a switch made on one has to reach the other; the record arrives as stored,
 * which is all a window needs to advance its copy of the log.
 */
export function onEventAppended(
  handler: (event: EventRecord) => void,
): Promise<UnlistenFn> {
  return listen<EventRecord>("event-appended", (message) =>
    handler(message.payload),
  );
}
