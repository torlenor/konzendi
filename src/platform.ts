/** Whether the detected desktop has a global-shortcut backend. */
export function supportsGlobalShortcut(windowSystem: string): boolean {
  return ["x11", "windows", "macos"].includes(windowSystem);
}
