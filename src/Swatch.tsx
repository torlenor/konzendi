import { topicColorStyle } from "./topicColor";

/**
 * The round mark of a topic color, drawn before the topic name. It adds a signal and
 * replaces none, so it is hidden from a screen reader. A topic without a color has no
 * swatch, which is how it looked before topic colors existed.
 */
export function Swatch({ color }: { color: string | null }) {
  if (color === null) return null;
  return (
    <span
      className="swatch"
      aria-hidden="true"
      style={topicColorStyle(color)}
    />
  );
}
