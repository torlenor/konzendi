import { invoke } from "@tauri-apps/api/core";
import type { UnlistenFn } from "@tauri-apps/api/event";
import { getCurrentWindow, LogicalSize, Window } from "@tauri-apps/api/window";

/**
 * Desktop integration: which window this script runs in, and how the quick switcher
 * appears and dismisses. `store.ts` keeps the event log; nothing here records anything.
 */

export const QUICK = "quick";
const QUICK_WIDTH = 360;
const QUICK_EDGE = 2;

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
 * The surface is as tall as its rows, so it sizes itself while hidden and centres
 * itself again afterwards. Showing it then needs no resize the user could watch.
 */
export async function fitQuick(contentHeight: number): Promise<void> {
  const self = getCurrentWindow();
  await self.setSize(
    new LogicalSize(QUICK_WIDTH, Math.round(contentHeight + QUICK_EDGE)),
  );
  await self.center();
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
