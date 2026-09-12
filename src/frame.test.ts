import { describe, expect, it } from "vitest";
import { readFramePreference } from "./frame";

describe("frame preference", () => {
  it("accepts the two stored choices", () => {
    expect(readFramePreference({ getItem: () => "custom" })).toBe("custom");
    expect(readFramePreference({ getItem: () => "native" })).toBe("native");
  });

  it("uses the application frame when storage is invalid or denied", () => {
    expect(readFramePreference({ getItem: () => "other" })).toBe("custom");
    expect(
      readFramePreference({
        getItem: () => {
          throw new Error("storage denied");
        },
      }),
    ).toBe("custom");
  });
});
