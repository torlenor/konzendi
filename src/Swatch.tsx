import { topicColorStyle } from "./topicColor";

/**
 * The round mark of a topic color, drawn before the topic name. It adds a signal and
 * replaces none, so it is hidden from a screen reader. A topic without a color gets an
 * empty ring, so every name in a list starts at the same place.
 *
 * A row that shows no topic, such as a stop or a command, sets `blank`. It then gets the
 * same space without the ring, because it is not a topic that has no color.
 */
export function Swatch({
  color,
  blank = false,
}: {
  color: string | null;
  blank?: boolean;
}) {
  const kind =
    color !== null ? "swatch" : blank ? "swatch blank" : "swatch empty";
  return (
    <span className={kind} aria-hidden="true" style={topicColorStyle(color)} />
  );
}
