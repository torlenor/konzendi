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

/** Order two RFC 3339 timestamps, keeping the digits Date.parse drops. */
export function compareTimestamps(a: string, b: string): number {
  return Date.parse(a) - Date.parse(b) || submillis(a) - submillis(b);
}

/** Break a timestamp tie the same way on every device. */
export function compareIds(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
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
      compareTimestamps(a.recordedAt, b.recordedAt) || compareIds(a.id, b.id),
  );
}
