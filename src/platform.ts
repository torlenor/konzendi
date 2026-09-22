/** Whether the detected desktop has a global-shortcut backend. */
export function supportsGlobalShortcut(windowSystem: string): boolean {
  return ["x11", "windows", "macos"].includes(windowSystem);
}

/**
 * Whether the tracking chip can be offered. It needs keep-above, a global position, and the
 * pointer position from X, and it was verified only on X11 with Muffin.
 */
export function supportsChip(windowSystem: string): boolean {
  return windowSystem === "x11";
}
