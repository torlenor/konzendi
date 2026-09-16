import type { CSSProperties } from "react";

/**
 * Topic colors in the interface. A color tells topics apart; it never replaces a key,
 * a mark, a name, or wording, and no text is painted in it or on it.
 */

/**
 * Suggestions only; any `#rrggbb` color can be saved. Each one has a contrast of at
 * least 3.3:1 against the ground and the band of both themes.
 */
export const SUGGESTED_COLORS: readonly { color: string; name: string }[] = [
  { color: "#d03a2c", name: "Red" },
  { color: "#a66023", name: "Orange" },
  { color: "#84701c", name: "Olive" },
  { color: "#1c832d", name: "Green" },
  { color: "#1b7f76", name: "Teal" },
  { color: "#2c70ce", name: "Blue" },
  { color: "#934dd9", name: "Violet" },
  { color: "#cd2b89", name: "Pink" },
];

/**
 * The surfaces a swatch or a lane segment is drawn on: `--ground` and `--band` in
 * App.css. Keep these values the same as the tokens.
 */
const SURFACES = {
  light: ["#dae1e3", "#f1f4f5"],
  dark: ["#0d151a", "#152229"],
} as const;

export type Mode = keyof typeof SURFACES;

/** The contrast floor for a graphical object (WCAG 2.2, 1.4.11). */
export const MIN_CONTRAST = 3;

/** Read a typed color as lower-case `#rrggbb`, with or without `#`, or return null. */
export function parseHexColor(text: string): string | null {
  const match = /^#?([0-9a-f]{6})$/i.exec(text.trim());
  return match ? `#${match[1].toLowerCase()}` : null;
}

function luminance(color: string): number {
  const channel = (offset: number) => {
    const value = Number.parseInt(color.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

/** The WCAG contrast ratio of two `#rrggbb` colors, from 1 to 21. */
export function contrastRatio(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/** The lowest contrast of a color against the surfaces of each theme. */
export function contrastByMode(color: string): Record<Mode, number> {
  const lowest = (mode: Mode) =>
    Math.min(...SURFACES[mode].map((surface) => contrastRatio(color, surface)));
  return { light: lowest("light"), dark: lowest("dark") };
}

/** The themes in which a color is below the contrast floor. */
export function weakModes(color: string): Mode[] {
  const ratios = contrastByMode(color);
  return (Object.keys(ratios) as Mode[]).filter(
    (mode) => ratios[mode] < MIN_CONTRAST,
  );
}

/** The custom property that carries a topic color into App.css. */
export function topicColorStyle(
  color: string | null,
): CSSProperties | undefined {
  return color === null
    ? undefined
    : ({ "--topic-color": color } as CSSProperties);
}
