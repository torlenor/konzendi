import { describe, expect, it } from "vitest";
import { quickKeyPressed, watchSuperKey } from "./quickKeys";

const base = {
  key: "3",
  ctrlKey: false,
  altKey: false,
  metaKey: false,
  shiftKey: false,
  repeat: false,
  isComposing: false,
  target: null,
};

const press = (overrides: Partial<Parameters<typeof quickKeyPressed>[0]>) =>
  quickKeyPressed({
    key: "3",
    ctrlKey: false,
    altKey: false,
    metaKey: false,
    shiftKey: false,
    repeat: false,
    isComposing: false,
    target: null,
    ...overrides,
  });

describe("quickKeyPressed", () => {
  it("accepts a literal, unmodified digit from 1 to 9", () => {
    expect(press({})).toBe("3");
    expect(press({ key: "1" })).toBe("1");
    expect(press({ key: "9" })).toBe("9");
  });

  it("ignores other keys", () => {
    for (const key of ["0", "a", "Enter", " ", "!", "F1"]) {
      expect(press({ key })).toBeNull();
    }
  });

  it("ignores modified, repeated, and composing presses", () => {
    expect(press({ ctrlKey: true })).toBeNull();
    expect(press({ altKey: true })).toBeNull();
    expect(press({ metaKey: true })).toBeNull();
    expect(press({ shiftKey: true })).toBeNull();
    expect(quickKeyPressed({ ...base, key: "3" }, true)).toBeNull();
    expect(press({ repeat: true })).toBeNull();
    expect(press({ isComposing: true })).toBeNull();
    expect(press({ key: "Process" })).toBeNull();
  });

  it("ignores presses in editable controls", () => {
    for (const tagName of ["INPUT", "TEXTAREA", "SELECT"]) {
      expect(
        press({ target: { tagName } as unknown as EventTarget }),
      ).toBeNull();
    }
    expect(
      press({
        target: {
          tagName: "DIV",
          isContentEditable: true,
        } as unknown as EventTarget,
      }),
    ).toBeNull();
    expect(
      press({ target: { tagName: "BUTTON" } as unknown as EventTarget }),
    ).toBe("3");
  });
});

describe("watchSuperKey", () => {
  it("follows the Super key and releases it when focus is lost", () => {
    const listeners = new Map<string, (event: { key?: string }) => void>();
    const target = {
      addEventListener: (type: string, listener: () => void) =>
        listeners.set(type, listener),
      removeEventListener: (type: string) => listeners.delete(type),
    };
    const send = (type: string, key?: string) => listeners.get(type)?.({ key });
    const superKey = watchSuperKey(target as unknown as Window);
    expect(superKey.held()).toBe(false);
    send("keydown", "Super");
    expect(superKey.held()).toBe(true);
    send("keydown", "2");
    expect(superKey.held()).toBe(true);
    send("keyup", "Super");
    expect(superKey.held()).toBe(false);
    send("keydown", "Meta");
    send("blur");
    expect(superKey.held()).toBe(false);
    superKey.stop();
    expect(listeners.size).toBe(0);
  });
});
