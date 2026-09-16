import { describe, expect, it } from "vitest";
import { supportsGlobalShortcut } from "./platform";

describe("supportsGlobalShortcut", () => {
  it.each(["x11", "windows", "macos"])("accepts %s", (system) => {
    expect(supportsGlobalShortcut(system)).toBe(true);
  });

  it.each(["wayland", "unknown"])("rejects %s", (system) => {
    expect(supportsGlobalShortcut(system)).toBe(false);
  });
});
