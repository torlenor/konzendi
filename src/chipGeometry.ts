/**
 * Geometry of the tracking chip and of quick access opening from it. Every value is in
 * physical pixels unless a name says otherwise. The functions are pure, so the placement
 * rules can be tested without a window system.
 */

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

/** The inset of the chip inside quick access, in logical pixels, for the clip. */
export interface Inset {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export const contains = (area: Rect, x: number, y: number): boolean =>
  x >= area.x &&
  y >= area.y &&
  x < area.x + area.width &&
  y < area.y + area.height;

const clamp = (value: number, low: number, high: number): number =>
  Math.min(Math.max(value, low), high);

/**
 * Put a surface of the given size on the chip's corner. The corner nearest the edges of
 * the work area is used, so the surface opens toward the middle of the monitor. The
 * surface always stays inside the work area.
 */
export function anchoredPosition(
  chip: Rect,
  area: Rect,
  width: number,
  height: number,
): Point {
  const right = chip.x + chip.width / 2 > area.x + area.width / 2;
  const bottom = chip.y + chip.height / 2 > area.y + area.height / 2;
  return {
    x: clamp(
      right ? chip.x + chip.width - width : chip.x,
      area.x,
      area.x + area.width - width,
    ),
    y: clamp(
      bottom ? chip.y + chip.height - height : chip.y,
      area.y,
      area.y + area.height - height,
    ),
  };
}

/** The chip rectangle as an inset of the placed surface, for the expansion clip. */
export function chipInset(chip: Rect, surface: Rect, scale: number): Inset {
  return {
    top: Math.max(0, (chip.y - surface.y) / scale),
    left: Math.max(0, (chip.x - surface.x) / scale),
    right: Math.max(
      0,
      (surface.x + surface.width - (chip.x + chip.width)) / scale,
    ),
    bottom: Math.max(
      0,
      (surface.y + surface.height - (chip.y + chip.height)) / scale,
    ),
  };
}

/**
 * Keep the chip inside the work area, `gap` from its edges, and snap it to an edge that
 * it was dropped within `snap` of.
 */
export function snappedPosition(
  position: Point,
  size: { width: number; height: number },
  area: Rect,
  gap: number,
  snap: number,
): Point {
  const left = area.x + gap;
  const top = area.y + gap;
  const right = area.x + area.width - size.width - gap;
  const bottom = area.y + area.height - size.height - gap;
  let x = clamp(position.x, left, right);
  let y = clamp(position.y, top, bottom);
  if (x - area.x < snap) x = left;
  if (right - x < snap) x = right;
  if (y - area.y < snap) y = top;
  if (bottom - y < snap) y = bottom;
  return { x, y };
}

/** The first position of the chip: the top-right corner of the work area. */
export function defaultPosition(area: Rect, width: number, gap: number): Point {
  return { x: area.x + area.width - width - gap, y: area.y + gap };
}

/**
 * The new left edge after the chip changes width. A chip in the right half of its work
 * area keeps its right edge, so a longer topic name grows toward the middle.
 */
export function refittedX(
  x: number,
  oldWidth: number,
  newWidth: number,
  area: Rect,
): number {
  return x + oldWidth / 2 > area.x + area.width / 2
    ? x + oldWidth - newWidth
    : x;
}
