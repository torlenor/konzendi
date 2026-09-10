import { describe, expect, it } from "vitest";
import {
  DEFAULT_SHORTCUT,
  describeAccelerator,
  formatAccelerator,
  parseAccelerator,
} from "./shortcut";

/**
 * A rejected combination is the difference between a shortcut that does not work and one
 * that quietly takes a key away from every other application, so the reader is tested
 * against both ends of what it accepts.
 */
describe("parseAccelerator", () => {
  it("reads the default", () => {
    const accelerator = parseAccelerator(DEFAULT_SHORTCUT);
    expect(accelerator).toEqual({ modifiers: ["Control", "Alt"], key: "K" });
  });

  it("orders modifiers so one combination has one canonical form", () => {
    const written = ["Alt+Control+K", "Control+Alt+K", "ctrl+alt+k"];
    const canonical = written.map((text) => {
      const accelerator = parseAccelerator(text);
      if (accelerator === null) throw new Error(`rejected ${text}`);
      return formatAccelerator(accelerator);
    });
    expect(new Set(canonical)).toEqual(new Set(["Control+Alt+K"]));
  });

  it("accepts the aliases other platforms use", () => {
    expect(parseAccelerator("CmdOrControl+Shift+Space")).toEqual({
      modifiers: ["Control", "Shift"],
      key: "Space",
    });
    expect(parseAccelerator("Super+F5")).toEqual({
      modifiers: ["Super"],
      key: "F5",
    });
  });

  it.each([
    ["K", "no modifier: it would swallow the key everywhere"],
    ["Control+", "no key"],
    ["Control+K+J", "two keys"],
    ["Control+Control+K", "a repeated modifier"],
    ["Hyper+K", "a modifier the X11 grab does not report"],
    ["Control+Compose", "a key the grab cannot find"],
    ["", "nothing at all"],
  ])("rejects %j — %s", (text) => {
    expect(parseAccelerator(text)).toBeNull();
  });

  it("writes a combination the way a desktop writes it", () => {
    const accelerator = parseAccelerator("CommandOrControl+Alt+K");
    if (accelerator === null) throw new Error("rejected");
    expect(describeAccelerator(accelerator)).toBe("Ctrl+Alt+K");
  });
});
