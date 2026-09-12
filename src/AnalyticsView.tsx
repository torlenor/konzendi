import { useMemo, useState } from "react";
import { subjectLabel, subjectMark } from "./actions";
import { type DaySegment, sliceDay } from "./core/day";
import {
  formatClock,
  formatDay,
  formatDuration,
  isSameLocalDay,
  localDay,
  nowIso,
  shiftLocalDays,
} from "./time";
import { type Tracking, useNow } from "./useTracking";

/** Every third hour is labelled; the axis runs the whole day so two days compare. */
const TICKS = [0, 3, 6, 9, 12, 15, 18, 21, 24];

/**
 * What a segment says when it is read out or hovered. It names what the log holds,
 * including the parts that are cut off and the ones that look forgotten.
 */
function describe(segment: DaySegment, name: string): string {
  const parts = [
    // "lasting", because a length beside two clock times reads as a third time.
    `${name}, ${formatClock(segment.start)} to ${formatClock(segment.end)}, lasting ${formatDuration(segment.ms)}`,
  ];
  if (segment.fromEarlier) parts.push("continues from the day before");
  if (segment.intoLater) parts.push("continues into the next day");
  if (segment.open) parts.push("still running");
  if (segment.possiblyForgotten)
    parts.push("longer than 8 hours, possibly forgotten");
  return `${parts.join(", ")}.`;
}

export function AnalyticsView({ tracking }: { tracking: Tracking }) {
  const now = useNow();
  const [anchor, setAnchor] = useState(nowIso);
  const { start, end } = useMemo(() => localDay(anchor), [anchor]);
  const day = useMemo(
    () => sliceDay(tracking.state, start, end, now),
    [tracking.state, start, end, now],
  );

  const from = Date.parse(start);
  const span = Date.parse(end) - from;
  const position = (iso: string) => ((Date.parse(iso) - from) / span) * 100;
  const onToday = isSameLocalDay(anchor, now);
  const topics = tracking.state.topics;
  const { readings } = day;

  return (
    <section className="analytics">
      <div className="analytics-nav">
        <button
          type="button"
          className="quiet"
          onClick={() => setAnchor(shiftLocalDays(anchor, -1))}
        >
          ‹ Previous
        </button>
        <h2>{formatDay(anchor, now)}</h2>
        <button
          type="button"
          className="quiet"
          disabled={onToday}
          onClick={() => setAnchor(shiftLocalDays(anchor, 1))}
        >
          Next ›
        </button>
        <button
          type="button"
          className="quiet"
          disabled={onToday}
          onClick={() => setAnchor(nowIso())}
        >
          Today
        </button>
      </div>

      {day.lanes.length === 0 ? (
        <p className="note">No topic is recorded on this day.</p>
      ) : (
        <>
          <div className="lanes">
            {day.lanes.map((lane) => {
              const name = subjectLabel(topics, lane.subject);
              return (
                <div
                  className="lane"
                  key={
                    lane.subject.type === "topic"
                      ? lane.subject.topicId
                      : "stop"
                  }
                  data-state="running"
                >
                  <span className="lane-label">
                    <span className="mark" aria-hidden="true">
                      {subjectMark(lane.subject)}
                    </span>
                    {name}
                  </span>
                  <span className="lane-total">{formatDuration(lane.ms)}</span>
                  <div className="track">
                    {lane.segments.map((segment) => (
                      <span
                        className="segment"
                        key={`${segment.eventId}-${segment.start}`}
                        data-forgotten={segment.possiblyForgotten}
                        title={describe(segment, name)}
                        style={{
                          left: `${position(segment.start)}%`,
                          width: `${(segment.ms / span) * 100}%`,
                        }}
                      >
                        <span className="hidden">
                          {describe(segment, name)}
                        </span>
                      </span>
                    ))}
                    {onToday && (
                      <span
                        className="mark-now"
                        aria-hidden="true"
                        style={{
                          left: `${position(new Date(now).toISOString())}%`,
                        }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="axis" aria-hidden="true">
            <div className="ticks">
              {TICKS.map((hour) => (
                <span
                  className="tick"
                  key={hour}
                  style={{ left: `${(hour / 24) * 100}%` }}
                >
                  {String(hour).padStart(2, "0")}
                </span>
              ))}
            </div>
          </div>

          <dl className="readings">
            <div>
              <dt>Recorded on topics</dt>
              <dd>{formatDuration(readings.trackedMs)}</dd>
            </div>
            <div>
              <dt>Switches</dt>
              <dd>{readings.switches}</dd>
            </div>
            <div>
              <dt>Longest stretch</dt>
              <dd>
                {readings.longest === null
                  ? "none"
                  : `${formatDuration(readings.longest.ms)} · ${subjectLabel(topics, readings.longest.subject)}`}
                {/* The longest stretch is the reading most easily read as a result,
                    so it says when nothing ended it. */}
                {readings.longest?.possiblyForgotten && (
                  <span className="qualifier">possibly forgotten</span>
                )}
              </dd>
            </div>
          </dl>

          <p className="note">
            These are sums of what is logged on this day, not a measure of work.
            A stretch is one interval between two entries, and a switch is an
            entry that started work on a topic. Time when tracking was stopped
            is not measured: it is the gap between two stretches.
          </p>

          {day.hasPossiblyForgotten && (
            <p className="note" data-forgotten="true">
              One stretch or more is longer than 8 hours. Nothing ended it, so a
              switch was possibly not logged. It is drawn hatched and is
              included in the sums above. Correct it in Entries.
            </p>
          )}
        </>
      )}
    </section>
  );
}
