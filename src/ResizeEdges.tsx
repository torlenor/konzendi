/**
 * The resize regions of the application frame.
 *
 * tao starts a resize from five logical pixels inside each edge of an undecorated,
 * resizable window, but the webview paints the normal pointer over that region. These
 * zones cover the same region and only name the cursor for it: the press reaches the
 * built-in path exactly as it does today.
 */
const EDGES = [
  "north",
  "south",
  "west",
  "east",
  "north-west",
  "north-east",
  "south-west",
  "south-east",
] as const;

export function ResizeEdges() {
  return (
    <>
      {EDGES.map((edge) => (
        <span
          key={edge}
          className={`resize-edge ${edge}`}
          aria-hidden="true"
          // A press here starts tao's resize. Its default action in the webview is a
          // drag-selection of everything the pointer crosses, so it is refused. A
          // `user-select` rule does not stop it: it was measured and it selects anyway.
          onMouseDown={(event) => event.preventDefault()}
        />
      ))}
    </>
  );
}
