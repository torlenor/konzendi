/** Presentation of instants. The domain core stores RFC 3339 in UTC and never formats. */

export const nowIso = () => new Date().toISOString();

const pad = (value: number) => String(value).padStart(2, "0");

export function formatClock(iso: string): string {
  const time = new Date(iso);
  return `${pad(time.getHours())}:${pad(time.getMinutes())}`;
}

/** The clock time, prefixed with the day when it is not today. */
export function formatStamp(iso: string, now: number): string {
  const time = new Date(iso);
  const today = new Date(now);
  const sameDay =
    time.getFullYear() === today.getFullYear() &&
    time.getMonth() === today.getMonth() &&
    time.getDate() === today.getDate();
  return sameDay
    ? formatClock(iso)
    : `${time.toLocaleDateString(undefined, { day: "numeric", month: "short" })} ${formatClock(iso)}`;
}

/** Hours and minutes read at a glance; seconds are shown smaller, so they are separate. */
export function formatElapsedParts(
  iso: string,
  now: number,
): { hm: string; ss: string } {
  const seconds = Math.max(0, Math.floor((now - Date.parse(iso)) / 1000));
  return {
    hm: `${Math.floor(seconds / 3600)}:${pad(Math.floor(seconds / 60) % 60)}`,
    ss: pad(seconds % 60),
  };
}

export function shiftMinutes(iso: string, minutes: number): string {
  return new Date(Date.parse(iso) + minutes * 60_000).toISOString();
}

/** The editable form of an instant: local date and time, no seconds. */
export function formatLocalInput(iso: string): string {
  const time = new Date(iso);
  return `${time.getFullYear()}-${pad(time.getMonth() + 1)}-${pad(time.getDate())} ${pad(time.getHours())}:${pad(time.getMinutes())}`;
}

/** Read `YYYY-MM-DD HH:MM` as local time, or null when it is not a real instant. */
export function parseLocalInput(text: string): string | null {
  const parts = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/.exec(
    text.trim(),
  );
  if (!parts) return null;
  const [year, month, day, hour, minute] = parts.slice(1).map(Number);
  const time = new Date(year, month - 1, day, hour, minute);
  const rolledOver =
    time.getFullYear() !== year ||
    time.getMonth() !== month - 1 ||
    time.getDate() !== day ||
    time.getHours() !== hour ||
    time.getMinutes() !== minute;
  return Number.isNaN(time.getTime()) || rolledOver ? null : time.toISOString();
}
