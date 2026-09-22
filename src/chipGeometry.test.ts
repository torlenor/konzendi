import { describe, expect, it } from "vitest";
import {
  anchoredPosition,
  chipInset,
  defaultPosition,
  type Rect,
  refittedX,
  snappedPosition,
} from "./chipGeometry";
import { supportsChip } from "./platform";

// A 1600×900 monitor whose work area starts below a 40 px panel, and a second monitor
// to its right.
const area: Rect = { x: 0, y: 40, width: 1600, height: 860 };
const right: Rect = { x: 1600, y: 0, width: 1280, height: 1024 };
const quick = { width: 360, height: 230 };

describe("anchoredPosition", () => {
  it("opens down and to the left from a chip in the top-right corner", () => {
    const chip = { x: 1374, y: 48, width: 218, height: 32 };
    expect(anchoredPosition(chip, area, quick.width, quick.height)).toEqual({
      x: 1374 + 218 - 360,
      y: 48,
    });
  });

  it("opens up and to the right from a chip in the bottom-left corner", () => {
    const chip = { x: 8, y: 860, width: 218, height: 32 };
    expect(anchoredPosition(chip, area, quick.width, quick.height)).toEqual({
      x: 8,
      y: 860 + 32 - 230,
    });
  });

  it("stays inside the work area when the chip is narrower than the surface", () => {
    const chip = { x: 1560, y: 48, width: 32, height: 32 };
    expect(
      anchoredPosition(chip, area, quick.width, quick.height).x,
    ).toBeGreaterThanOrEqual(area.x);
    const edge = { x: area.x, y: 48, width: 32, height: 32 };
    // A chip on the left edge opens rightward, so it cannot pass the left edge.
    expect(anchoredPosition(edge, area, quick.width, quick.height).x).toBe(0);
  });

  it("measures the halves of the chip's own monitor", () => {
    // Left half of the right-hand monitor: opens to the right, not toward the left
    // monitor.
    const chip = { x: 1700, y: 100, width: 218, height: 32 };
    expect(anchoredPosition(chip, right, quick.width, quick.height)).toEqual({
      x: 1700,
      y: 100,
    });
  });
});

describe("chipInset", () => {
  it("describes the chip inside the surface in logical pixels", () => {
    const surface = { x: 1000, y: 40, width: 720, height: 460 };
    const chip = { x: 1284, y: 40, width: 436, height: 64 };
    expect(chipInset(chip, surface, 2)).toEqual({
      top: 0,
      left: 142,
      right: 0,
      bottom: 198,
    });
  });

  it("never gives a negative inset", () => {
    const surface = { x: 0, y: 40, width: 360, height: 230 };
    const chip = { x: -10, y: 30, width: 218, height: 32 };
    const inset = chipInset(chip, surface, 1);
    expect(inset.left).toBe(0);
    expect(inset.top).toBe(0);
  });
});

describe("snappedPosition", () => {
  const size = { width: 228, height: 42 };

  it("snaps to an edge the chip was dropped near", () => {
    expect(snappedPosition({ x: 1350, y: 840 }, size, area, 3, 24)).toEqual({
      x: 1600 - 228 - 3,
      y: 40 + 860 - 42 - 3,
    });
  });

  it("leaves a chip in the middle where it was dropped", () => {
    expect(snappedPosition({ x: 700, y: 400 }, size, area, 3, 24)).toEqual({
      x: 700,
      y: 400,
    });
  });

  it("brings a chip that was dragged off the work area back inside", () => {
    expect(snappedPosition({ x: -80, y: 10 }, size, area, 3, 24)).toEqual({
      x: 3,
      y: 43,
    });
  });
});

describe("defaultPosition", () => {
  it("is the top-right corner of the work area", () => {
    expect(defaultPosition(area, 228, 3)).toEqual({ x: 1369, y: 43 });
  });
});

describe("refittedX", () => {
  it("keeps the right edge of a chip in the right half", () => {
    expect(refittedX(1369, 228, 300, area)).toBe(1297);
  });

  it("keeps the left edge of a chip in the left half", () => {
    expect(refittedX(3, 228, 300, area)).toBe(3);
  });
});

describe("supportsChip", () => {
  it("accepts x11", () => {
    expect(supportsChip("x11")).toBe(true);
  });

  it.each(["wayland", "windows", "macos", "unknown"])(
    "rejects %s",
    (system) => {
      expect(supportsChip(system)).toBe(false);
    },
  );
});
