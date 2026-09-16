/**
 * The keyboard rule for topic quick keys in both windows. Only a literal, unmodified
 * digit from 1 to 9 counts, and never while the user types into a control.
 */

interface KeyPress {
  key: string;
  ctrlKey: boolean;
  altKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  repeat: boolean;
  isComposing: boolean;
  target: EventTarget | null;
}

const EDITABLE = new Set(["INPUT", "TEXTAREA", "SELECT"]);

function isEditable(target: EventTarget | null): boolean {
  if (target === null || typeof target !== "object") return false;
  const element = target as Partial<HTMLElement>;
  return (
    (typeof element.tagName === "string" && EDITABLE.has(element.tagName)) ||
    element.isContentEditable === true
  );
}

/** The digit a key press selects, or null when the press is not a quick key. */
export function quickKeyPressed(
  event: KeyPress,
  superHeld = false,
): string | null {
  if (
    event.ctrlKey ||
    event.altKey ||
    event.metaKey ||
    event.shiftKey ||
    superHeld
  )
    return null;
  // A held key repeats; composition sends keys that are not yet text.
  if (event.repeat || event.isComposing || event.key === "Process") return null;
  if (isEditable(event.target)) return null;
  return /^[1-9]$/.test(event.key) ? event.key : null;
}

const SUPER_KEYS = new Set(["Super", "Meta", "OS", "Hyper"]);

/**
 * WebKitGTK does not report the Super key as a modifier of the digit that follows it, so
 * Super is followed through its own key events. Losing focus releases it, because the
 * key can be released in another window.
 */
export function watchSuperKey(target: Window): {
  held: () => boolean;
  stop: () => void;
} {
  let held = false;
  const down = (event: KeyboardEvent) => {
    if (SUPER_KEYS.has(event.key)) held = true;
  };
  const up = (event: KeyboardEvent) => {
    if (SUPER_KEYS.has(event.key)) held = false;
  };
  const release = () => {
    held = false;
  };
  target.addEventListener("keydown", down, true);
  target.addEventListener("keyup", up, true);
  target.addEventListener("blur", release);
  return {
    held: () => held,
    stop: () => {
      target.removeEventListener("keydown", down, true);
      target.removeEventListener("keyup", up, true);
      target.removeEventListener("blur", release);
    },
  };
}
