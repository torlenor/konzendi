import { invoke } from "@tauri-apps/api/core";
import type { UnlistenFn } from "@tauri-apps/api/event";
import {
  availableMonitors,
  currentMonitor,
  getCurrentWindow,
  LogicalSize,
  type Monitor,
  PhysicalPosition,
  primaryMonitor,
  Window,
} from "@tauri-apps/api/window";
import { anchoredPosition, contains, type Rect } from "./chipGeometry";

/**
 * Desktop integration: which window this script runs in, and how the quick switcher
 * appears and dismisses. `store.ts` keeps the event log; nothing here records anything.
 */

export const QUICK = "quick";
const QUICK_WIDTH = 360;
const QUICK_EDGE = 2;
/** Space kept free above and below the surface when it is as tall as the work area. */
const QUICK_MARGIN = 48;

export const windowLabel: string = getCurrentWindow().label;

/** The window system in use. A global shortcut is an X11 key grab and nothing else. */
export function windowSystem(): Promise<string> {
  return invoke<string>("window_system");
}

let handle: Promise<Window> | null = null;

/** Both windows exist from startup, so this resolves without creating one. */
function quickWindow(): Promise<Window> {
  handle ??= Window.getByLabel(QUICK).then((found) => {
    if (found === null) throw new Error("the quick switcher window is missing");
    return found;
  });
  return handle;
}

/**
 * Bring the tracking window forward. Rust also replaces a visible quick switcher, so a
 * caller can report a failed request without dismissing that surface first.
 */
export async function showMain(): Promise<void> {
  await invoke("show_main");
}

/**
 * The directory the running store opened. The interface never calculates this itself: a
 * second answer can differ from the one the store holds, and the user is told this path.
 */
export function storageLocation(): Promise<string> {
  return invoke<string>("storage_location");
}

/**
 * Ask the desktop to show the data directory in its file manager. The promise is rejected
 * with a message for the user when no launcher opened the folder.
 */
export function openStorageLocation(): Promise<void> {
  return invoke("open_storage_location");
}

/** End the application. Only the tray offers this; the close button hides the window. */
export async function quit(): Promise<void> {
  await invoke("quit");
}

/** Window commands used by the application title bar. */
export function minimizeWindow(): Promise<void> {
  return getCurrentWindow().minimize();
}

export async function toggleWindowMaximized(): Promise<boolean> {
  const window = getCurrentWindow();
  await window.toggleMaximize();
  return window.isMaximized();
}

export function isWindowMaximized(): Promise<boolean> {
  return getCurrentWindow().isMaximized();
}

export function onWindowResized(
  handler: () => void | Promise<void>,
): Promise<UnlistenFn> {
  return getCurrentWindow().onResized(() => {
    void handler();
  });
}

export function closeWindowToTray(): Promise<void> {
  return getCurrentWindow().close();
}

/** Open the surface, or close it when it is already open: one key does both. */
export async function toggleQuick(): Promise<void> {
  const quick = await quickWindow();
  if (await quick.isVisible()) {
    await hideQuick();
    return;
  }
  await showFocused(quick);
}

/** Open the surface from its own window, with the keyboard, for the tracking chip. */
export async function showQuick(): Promise<void> {
  await showFocused(await quickWindow());
}

/**
 * The tracking chip that quick access opens from, in physical pixels. While it is set,
 * the surface is placed on the chip's corner instead of in the center.
 */
export type QuickAnchor = Rect;
let anchor: QuickAnchor | null = null;
export const setQuickAnchor = (next: QuickAnchor | null): void => {
  anchor = next;
};
export const quickAnchor = (): QuickAnchor | null => anchor;

/** Where the surface was placed, in physical pixels, and the monitor scale. */
export interface QuickPlacement {
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
}

/** Put the surface on the chip's corner, on the monitor that shows the chip. */
async function placeAtAnchor(
  chip: QuickAnchor,
  height: number,
): Promise<QuickPlacement | null> {
  const monitors = await availableMonitors();
  const area = (m: Monitor): Rect => ({
    ...m.workArea.position,
    ...m.workArea.size,
  });
  const cx = chip.x + chip.width / 2;
  const cy = chip.y + chip.height / 2;
  const monitor =
    monitors.find((m) => contains(area(m), cx, cy)) ?? (await primaryMonitor());
  if (monitor === null) return null;
  const scale = monitor.scaleFactor;
  const width = Math.round(QUICK_WIDTH * scale);
  const tall = Math.round(height * scale);
  const { x, y } = anchoredPosition(chip, area(monitor), width, tall);
  await getCurrentWindow().setPosition(new PhysicalPosition(x, y));
  return { x, y, width, height: tall, scale };
}

/**
 * Showing a window and being given the keyboard are separate steps, and the second is
 * refused while the window is still being mapped. `show_quick` asks for both and is
 * safe to repeat, so it is repeated until the window reports that it has the keyboard:
 * a surface without it would swallow the keystroke it exists to receive.
 */
async function showFocused(quick: Window): Promise<void> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    // A dismissal must not be undone by a retry that is still asking for the keyboard:
    // the first row a user picks can be picked before this loop has given up.
    if (attempt > 0 && !(await quick.isVisible())) return;
    await invoke("show_quick");
    if (await quick.isFocused()) return;
    await new Promise((resume) => setTimeout(resume, 25));
  }
}

/** Dismiss the surface, which also hands the keyboard back to the interrupted window. */
export async function hideQuick(): Promise<void> {
  await invoke("hide_quick");
}

/**
 * The surface is as tall as its rows, so it sizes itself while hidden and centers
 * itself again afterward. Showing it then needs no resize the user could watch. It
 * also resizes while open, when Other topics opens or closes.
 */
export async function fitQuick(
  contentHeight: number,
): Promise<QuickPlacement | null> {
  const self = getCurrentWindow();
  const height = Math.round(contentHeight + QUICK_EDGE);
  await self.setSize(new LogicalSize(QUICK_WIDTH, height));
  if (anchor !== null) return placeAtAnchor(anchor, height);
  // X11 applies a size later than the call returns, and `center` reads the size that
  // was applied. When the surface resizes while it is open, or just after it closed,
  // `center` uses the old height. So the position is calculated from the new size.
  const monitor = await quickMonitor();
  if (monitor === null) {
    await self.center();
    return null;
  }
  const scale = monitor.scaleFactor;
  await self.setPosition(
    new PhysicalPosition(
      Math.round(
        monitor.position.x + (monitor.size.width - QUICK_WIDTH * scale) / 2,
      ),
      Math.round(
        monitor.position.y + (monitor.size.height - height * scale) / 2,
      ),
    ),
  );
  return null;
}

/** A hidden window can have no current monitor, so the primary one is used then. */
async function quickMonitor(): Promise<Monitor | null> {
  try {
    return (await currentMonitor()) ?? (await primaryMonitor());
  } catch {
    return null;
  }
}

/**
 * The tallest the surface can be, in logical pixels: the work area of its monitor, less a
 * margin. When no monitor is known, the screen that the webview reports is used.
 */
export async function quickMaxHeight(): Promise<number> {
  const monitor = await quickMonitor();
  const available =
    monitor === null
      ? window.screen.availHeight
      : monitor.workArea.size.toLogical(monitor.scaleFactor).height;
  return Math.max(120, Math.floor(available - QUICK_MARGIN - QUICK_EDGE));
}

/** Whether this window has the keyboard right now. */
export function isQuickFocused(): Promise<boolean> {
  return getCurrentWindow().isFocused();
}

/**
 * Focus changes of the window this script runs in. The surface dismisses itself when it
 * loses focus, which is also what happens when the user simply clicks back into work.
 */
export function onQuickFocusChanged(
  handler: (focused: boolean) => void | Promise<void>,
): Promise<UnlistenFn> {
  return getCurrentWindow().onFocusChanged(({ payload }) => {
    void handler(payload);
  });
}
