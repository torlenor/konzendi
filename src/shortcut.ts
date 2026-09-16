/**
 * The global shortcut as a setting. Like the appearance, it is a preference about the
 * application rather than tracking data, so it never enters the event log.
 *
 * An accelerator is Tauri's own string form: modifiers then one key, joined by `+`.
 * Only the four modifiers supported by the desktop plugin are accepted. A combination
 * with another modifier could be recorded but could never become active.
 */

const KEY = "konzendi.shortcut";

export const DEFAULT_SHORTCUT = "Control+Alt+K";

const MODIFIERS = ["Control", "Alt", "Shift", "Super"] as const;

type Modifier = (typeof MODIFIERS)[number];

export interface Accelerator {
  modifiers: readonly Modifier[];
  key: string;
}

const ALIASES: Record<string, Modifier> = {
  control: "Control",
  ctrl: "Control",
  controlorcommand: "Control",
  cmdorcontrol: "Control",
  commandorcontrol: "Control",
  alt: "Alt",
  option: "Alt",
  shift: "Shift",
  super: "Super",
  meta: "Super",
  command: "Super",
  cmd: "Super",
};

/** A single key as the grab can find it: a letter, a digit, or a named key. */
const NAMED = [
  "Space",
  "Enter",
  "Tab",
  "Backquote",
  "Comma",
  "Period",
  "Slash",
  "Backslash",
  "Semicolon",
  "Quote",
  "Minus",
  "Equal",
  ...Array.from({ length: 12 }, (_, index) => `F${index + 1}`),
];

function readKey(token: string): string | null {
  const upper = token.toUpperCase();
  if (/^[A-Z0-9]$/.test(upper)) return upper;
  const named = NAMED.find((name) => name.toUpperCase() === upper);
  return named ?? null;
}

/**
 * Read an accelerator, or return null when it is not one this build can register:
 * an unknown token, no key, two keys, or no modifier at all. A combination without a
 * modifier would swallow that key for every application on the desktop.
 */
export function parseAccelerator(text: string): Accelerator | null {
  const tokens = text
    .split("+")
    .map((token) => token.trim())
    .filter((token) => token !== "");
  if (tokens.length < 2) return null;
  const modifiers: Modifier[] = [];
  let key: string | null = null;
  for (const token of tokens) {
    const modifier = ALIASES[token.toLowerCase()];
    if (modifier !== undefined) {
      if (modifiers.includes(modifier)) return null;
      modifiers.push(modifier);
      continue;
    }
    if (key !== null) return null;
    key = readKey(token);
    if (key === null) return null;
  }
  if (key === null || modifiers.length === 0) return null;
  return {
    modifiers: MODIFIERS.filter((modifier) => modifiers.includes(modifier)),
    key,
  };
}

/** The canonical string handed to the plugin. */
export function formatAccelerator(accelerator: Accelerator): string {
  return [...accelerator.modifiers, accelerator.key].join("+");
}

/** How the combination is written on screen, in the desktop's own notation. */
export function describeAccelerator(accelerator: Accelerator): string {
  const shown: Record<Modifier, string> = {
    Control: "Ctrl",
    Alt: "Alt",
    Shift: "Shift",
    Super: "Super",
  };
  return [...accelerator.modifiers.map((m) => shown[m]), accelerator.key].join(
    "+",
  );
}

/** A keyboard event as an accelerator, for recording a combination by pressing it. */
export function accelerateEvent(event: KeyboardEvent): Accelerator | null {
  const modifiers = MODIFIERS.filter(
    (modifier) =>
      (modifier === "Control" && event.ctrlKey) ||
      (modifier === "Alt" && event.altKey) ||
      (modifier === "Shift" && event.shiftKey) ||
      (modifier === "Super" && event.metaKey),
  );
  if (modifiers.length === 0) return null;
  const key = readKey(event.code.replace(/^(Key|Digit)/, ""));
  return key === null ? null : { modifiers, key };
}

/** A browser with storage denied still runs; it just forgets the choice. */
export function readShortcut(): string {
  try {
    const stored = localStorage.getItem(KEY);
    if (stored !== null && parseAccelerator(stored) !== null) return stored;
  } catch {
    // An unreadable preference falls back to the default.
  }
  return DEFAULT_SHORTCUT;
}

export function writeShortcut(accelerator: string): void {
  try {
    localStorage.setItem(KEY, accelerator);
  } catch {
    // A forgotten preference is not worth an error message.
  }
}
