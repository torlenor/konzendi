import { describe, expect, it } from "vitest";
import {
  contrastByMode,
  contrastRatio,
  MIN_CONTRAST,
  parseHexColor,
  SUGGESTED_COLORS,
  weakModes,
} from "./topicColor";

describe("parseHexColor", () => {
  it("reads six hexadecimal digits with or without # and folds the case", () => {
    expect(parseHexColor("#A1B2C3")).toBe("#a1b2c3");
    expect(parseHexColor("a1b2c3")).toBe("#a1b2c3");
    expect(parseHexColor("  #00ff00 ")).toBe("#00ff00");
  });

  it("rejects shorthand, names, functions, alpha, and blanks", () => {
    for (const text of ["#abc", "red", "rgb(1,2,3)", "#a1b2c3ff", "", "#"]) {
      expect(parseHexColor(text)).toBeNull();
    }
  });
});

describe("contrast", () => {
  it("matches the WCAG reference values", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
    expect(contrastRatio("#777777", "#ffffff")).toBeCloseTo(4.48, 2);
  });

  it("keeps every suggested color above the floor in both themes", () => {
    for (const { color } of SUGGESTED_COLORS) {
      const ratios = contrastByMode(color);
      expect(ratios.light).toBeGreaterThanOrEqual(MIN_CONTRAST);
      expect(ratios.dark).toBeGreaterThanOrEqual(MIN_CONTRAST);
    }
  });

  it("names the theme in which a color is weak", () => {
    expect(weakModes("#f0f0f0")).toEqual(["light"]);
    expect(weakModes("#101820")).toEqual(["dark"]);
    expect(weakModes("#2c70ce")).toEqual([]);
    expect(weakModes("#808080").length).toBeLessThanOrEqual(1);
  });
});
