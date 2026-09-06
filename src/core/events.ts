export interface EventRecord {
  id: string;
  device: string;
  recordedAt: string;
  kind: string;
  payload: unknown;
}

// Date.parse discards sub-millisecond precision present in Rust timestamps.
function submillis(timestamp: string): number {
  const fraction = /\.(\d+)/.exec(timestamp)?.[1] ?? "";
  return Number(fraction.padEnd(9, "0").slice(3, 9));
}

/** Union immutable device logs; first occurrence wins for duplicate event ids. */
export function mergeEvents(
  ...logs: readonly (readonly EventRecord[])[]
): EventRecord[] {
  const unique = new Map<string, EventRecord>();
  for (const log of logs) {
    for (const event of log) {
      if (!unique.has(event.id)) unique.set(event.id, event);
    }
  }
  return [...unique.values()].sort(
    (a, b) =>
      Date.parse(a.recordedAt) - Date.parse(b.recordedAt) ||
      submillis(a.recordedAt) - submillis(b.recordedAt) ||
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
}
