import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import markOnDark from "../assets/logo/konzendi-mark-on-dark.svg";
import markOnLight from "../assets/logo/konzendi-mark-on-light.svg";
import { colorOf, STOP_MARK, subjectLabel, TOPIC_MARK } from "./actions";
import {
  chipMargin,
  chipPrivate,
  expandChip,
  fitChip,
  noteChipMoved,
  onChipPreferences,
  placeChip,
  setChipPrivate,
  setChipVisible,
  settleChip,
} from "./chip";
import type { TrackingState } from "./core/fold";
import { Swatch } from "./Swatch";
import { formatElapsedParts } from "./time";
import { useNow, useTracking } from "./useTracking";
import "./App.css";

const DRAG_START = 4;

/** The face of the chip. Quick access draws the same face while it expands. */
export function ChipFace({
  state,
  now,
  privateView,
  hover = false,
  className = "",
  style,
}: {
  state: TrackingState;
  now: number;
  privateView: boolean;
  hover?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const current = state.current;
  const trail = hover ? (
    <span className="chip-hide" title="Hide chip">
      ✕
    </span>
  ) : privateView || current === null ? (
    ""
  ) : (
    formatElapsedParts(current.start, now).hm
  );
  if (privateView || current === null) {
    return (
      <div className={`chip ${className}`} style={style}>
        <img className="chip-logo on-light" src={markOnLight} alt="" />
        <img className="chip-logo on-dark" src={markOnDark} alt="" />
        <span className="chip-name">Konzendi</span>
        <span className="chip-trail">{trail}</span>
      </div>
    );
  }
  const stopped = current.subject.type === "pause";
  return (
    <div
      className={`chip ${className}`}
      data-state={stopped ? "stopped" : "running"}
      style={style}
    >
      <span className="chip-mark">{stopped ? STOP_MARK : TOPIC_MARK}</span>
      {!stopped && (
        <Swatch color={colorOf(state.topics, current.subject)} blank={false} />
      )}
      <span className="chip-name">
        {subjectLabel(state.topics, current.subject)}
      </span>
      <span className="chip-trail">{trail}</span>
    </div>
  );
}

export function ChipView() {
  const { state, loading } = useTracking();
  const now = useNow(15_000);
  const [privateView, setPrivateView] = useState(chipPrivate);
  const [hover, setHover] = useState(false);
  const face = useRef<HTMLDivElement>(null);
  const applied = useRef(0);
  const press = useRef<{ x: number; y: number; dragging: boolean } | null>(
    null,
  );
  const step = useRef(false);

  useEffect(() => onChipPreferences(() => setPrivateView(chipPrivate())), []);

  // The window is as wide as the chip. The first fit also places it. Fits run one after
  // another, because each one reads the geometry the one before it set. The width can
  // also change without a render, when the font arrives.
  // Nothing is laid out until the log has loaded, so the placeholder face never sets
  // the position that the real chip then grows from.
  const layout = useRef<Promise<void>>(Promise.resolve());
  useEffect(() => {
    const element = face.current;
    if (element === null || loading) return;
    const observer = new ResizeObserver(() => {
      const width = Math.ceil(element.getBoundingClientRect().width);
      if (width === 0 || width === applied.current) return;
      const first = applied.current === 0;
      applied.current = width;
      layout.current = layout.current
        .then(() => fitChip(width))
        .then(() => (first ? placeChip(width) : undefined))
        .catch(() => undefined);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [loading]);

  // A move ends without a pointer event, so the position settles after it stops.
  useEffect(() => {
    let timer: number | undefined;
    const moved = getCurrentWindow().onMoved(({ payload }) => {
      noteChipMoved(payload.x, payload.y);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void settleChip(), 300);
    });
    return () => {
      window.clearTimeout(timer);
      void moved.then((unlisten) => unlisten());
    };
  }, []);

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: the chip is a pointer shortcut to quick access, which is reachable by keyboard through the global shortcut.
    <div
      ref={face}
      className="chip-host"
      style={{ padding: `${chipMargin()}px` }}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        press.current = { x: event.screenX, y: event.screenY, dragging: false };
      }}
      onPointerMove={(event) => {
        const held = press.current;
        if (held === null) return;
        if (!held.dragging) {
          if (
            Math.hypot(event.screenX - held.x, event.screenY - held.y) <
            DRAG_START
          )
            return;
          held.dragging = true;
          void invoke("chip_drag", { phase: "begin" });
        }
        // One move in flight at a time; the next step reads the pointer again.
        if (step.current) return;
        step.current = true;
        void invoke("chip_drag", { phase: "move" }).finally(() => {
          step.current = false;
        });
      }}
      onPointerUp={(event) => {
        const held = press.current;
        press.current = null;
        if (held === null) return;
        if (held.dragging) {
          void invoke("chip_drag", { phase: "move" })
            .then(() => invoke("chip_drag", { phase: "end" }))
            .then(() => settleChip());
          return;
        }
        if ((event.target as HTMLElement).closest(".chip-hide")) {
          void setChipVisible(false);
          return;
        }
        void expandChip();
      }}
      onContextMenu={(event) => {
        event.preventDefault();
        setChipPrivate(!privateView);
        setPrivateView(!privateView);
      }}
    >
      <ChipFace
        state={state}
        now={now}
        privateView={privateView}
        hover={hover}
      />
    </div>
  );
}
