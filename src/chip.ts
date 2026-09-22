import { invoke } from "@tauri-apps/api/core";
import { emitTo } from "@tauri-apps/api/event";
import {
  availableMonitors,
  currentMonitor,
  getCurrentWindow,
  LogicalSize,
  type Monitor,
  PhysicalPosition,
  primaryMonitor,
} from "@tauri-apps/api/window";
import {
  contains,
  defaultPosition,
  type Rect,
  refittedX,
  snappedPosition,
} from "./chipGeometry";

/**
 * The tracking chip (Phase 27): a small window that stays above other windows and shows
 * the current topic. A click opens quick access from it. The chip exists only on Linux
 * and is offered only on X11. Its preferences are view state, not tracking data, so they
 * are kept in local storage like the appearance preference.
 */

export const CHIP = "chip";
const CHIP_HEIGHT = 32;
/** The event that asks quick access to open from the chip. */
export const CHIP_EXPAND = "chip-expand";

const VISIBLE_KEY = "konzendi.chip.visible";
const PRIVATE_KEY = "konzendi.chip.private";
const POSITION_KEY = "konzendi.chip.position";
/** Space between the visible chip and a work-area edge, in logical pixels. */
const EDGE_GAP = 8;
/** Distance from an edge that snaps the chip to it, in logical pixels. */
const SNAP = 24;

/**
 * The transparent margin around the chip, in logical pixels. tao gives an undecorated
 * resizable window resize edges five GDK pixels times the GDK scale wide. The margin has
 * that width and lets the pointer through, so the edges never see it.
 */
export const chipMargin = (): number =>
  5 * Math.max(1, Math.round(window.devicePixelRatio));
const windowHeight = (): number => CHIP_HEIGHT + 2 * chipMargin();
/** The gap between the window edge and the work-area edge, in logical pixels. */
const windowGap = (): number => EDGE_GAP - chipMargin();

/**
 * The window's geometry as this window last set or saw it, in physical pixels. X11
 * applies a size or a position later than the call returns, so reading it back can give
 * the previous value.
 */
let known: { x: number; y: number; width: number } | null = null;

/** Record a position that the window manager reported. */
export function noteChipMoved(x: number, y: number): void {
  if (known !== null) known = { ...known, x, y };
}

function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === "true";
  } catch {
    return false;
  }
}

function writeFlag(key: string, value: boolean): void {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // A forgotten preference is not worth an error message.
  }
}

export const chipVisible = (): boolean => readFlag(VISIBLE_KEY);
export const chipPrivate = (): boolean => readFlag(PRIVATE_KEY);
export const setChipPrivate = (value: boolean): void =>
  writeFlag(PRIVATE_KEY, value);

export async function setChipVisible(visible: boolean): Promise<void> {
  writeFlag(VISIBLE_KEY, visible);
  await invoke(visible ? "show_chip" : "hide_chip");
}

/** A storage event reaches the other windows, not the window that wrote the value. */
export function onChipPreferences(handler: () => void): () => void {
  const listener = (event: StorageEvent) => {
    if (event.key?.startsWith("konzendi.chip.")) handler();
  };
  window.addEventListener("storage", listener);
  return () => window.removeEventListener("storage", listener);
}

const workArea = (monitor: Monitor): Rect => ({
  ...monitor.workArea.position,
  ...monitor.workArea.size,
});

/** The monitor setup, so a stored position is used only on the setup it was made on. */
async function monitorSetup(): Promise<string> {
  const monitors = await availableMonitors();
  return monitors
    .map(
      (m) =>
        `${m.name ?? "?"}@${m.position.x},${m.position.y}:${m.size.width}x${m.size.height}`,
    )
    .sort()
    .join("|");
}

async function monitorAt(x: number, y: number): Promise<Monitor | null> {
  const monitors = await availableMonitors();
  return (
    monitors.find((m) => contains(workArea(m), x, y)) ??
    (await currentMonitor()) ??
    (await primaryMonitor())
  );
}

/**
 * Put the chip where it was on this monitor setup. On another setup, or when the stored
 * position is on no monitor, it goes to the top-right corner of the primary monitor.
 * `width` is the logical window width: X11 has not applied the new size yet.
 */
export async function placeChip(width: number): Promise<void> {
  const self = getCurrentWindow();
  let stored: { x: number; y: number; setup: string } | null = null;
  try {
    stored = JSON.parse(localStorage.getItem(POSITION_KEY) ?? "null");
  } catch {
    stored = null;
  }
  if (stored !== null && stored.setup === (await monitorSetup())) {
    const { x, y } = stored;
    const monitor = (await availableMonitors()).find((m) =>
      contains(workArea(m), x, y),
    );
    if (monitor !== undefined) {
      await self.setPosition(new PhysicalPosition(x, y));
      known = { x, y, width: Math.round(width * monitor.scaleFactor) };
      return;
    }
  }
  const primary = (await primaryMonitor()) ?? (await currentMonitor());
  if (primary === null) return;
  const scale = primary.scaleFactor;
  const physical = Math.round(width * scale);
  const { x, y } = defaultPosition(
    workArea(primary),
    physical,
    Math.round(windowGap() * scale),
  );
  await self.setPosition(new PhysicalPosition(x, y));
  known = { x, y, width: physical };
}

/**
 * Give the window the width of the chip. GTK gives a window that is not resizable the
 * natural size of the webview, 200 by 200, so the window is resizable and held to one
 * size by equal minimum and maximum sizes.
 */
export async function fitChip(width: number): Promise<void> {
  const self = getCurrentWindow();
  let position = { x: known?.x ?? 0, y: known?.y ?? 0 };
  let oldWidth = known?.width ?? 0;
  if (known === null) {
    const [outer, extent] = await Promise.all([
      self.outerPosition(),
      self.outerSize(),
    ]);
    position = outer;
    oldWidth = extent.width;
  }
  const monitor = await monitorAt(position.x, position.y);
  const next = Math.round(width * (monitor?.scaleFactor ?? 1));
  const exact = new LogicalSize(width, windowHeight());
  await self.setMinSize(null);
  await self.setMaxSize(null);
  await self.setSize(exact);
  await self.setMinSize(exact);
  await self.setMaxSize(exact);
  await invoke("chip_input_shape", {
    width,
    height: windowHeight(),
    margin: chipMargin(),
  });
  if (known === null) return;
  known = { ...known, width: next };
  if (monitor === null || next === oldWidth) return;
  const x = refittedX(position.x, oldWidth, next, workArea(monitor));
  if (x !== position.x) {
    await self.setPosition(new PhysicalPosition(x, position.y));
    known = { ...known, x };
  }
}

/** Snap the chip to a near work-area edge, then store where it is. */
export async function settleChip(): Promise<void> {
  const self = getCurrentWindow();
  const [position, outer] = await Promise.all([
    self.outerPosition(),
    self.outerSize(),
  ]);
  const size = { width: known?.width ?? outer.width, height: outer.height };
  const monitor = await monitorAt(
    position.x + size.width / 2,
    position.y + size.height / 2,
  );
  if (monitor === null) return;
  const scale = monitor.scaleFactor;
  const { x, y } = snappedPosition(
    position,
    size,
    workArea(monitor),
    Math.round(windowGap() * scale),
    Math.round(SNAP * scale),
  );
  if (x !== position.x || y !== position.y) {
    await self.setPosition(new PhysicalPosition(x, y));
  }
  known = { x, y, width: size.width };
  try {
    localStorage.setItem(
      POSITION_KEY,
      JSON.stringify({ x, y, setup: await monitorSetup() }),
    );
  } catch {
    // The chip goes back to its default corner next time.
  }
}

/** Ask quick access to open from the visible chip, not from the window's margin. */
export async function expandChip(): Promise<void> {
  const self = getCurrentWindow();
  const [position, size] = await Promise.all([
    self.outerPosition(),
    self.outerSize(),
  ]);
  const inset = Math.round(chipMargin() * window.devicePixelRatio);
  const rect: Rect = {
    x: (known?.x ?? position.x) + inset,
    y: (known?.y ?? position.y) + inset,
    width: (known?.width ?? size.width) - 2 * inset,
    height: size.height - 2 * inset,
  };
  await emitTo("quick", CHIP_EXPAND, rect);
}
