import { useId, useMemo, useState } from "react";
import { colorOf, subjectLabel } from "./actions";
import type { Subject } from "./core/fold";
import { type Session, sliceWeek } from "./core/week";
import { Swatch } from "./Swatch";
import {
  formatClock,
  formatDuration,
  formatWeek,
  formatWeekday,
  isSameLocalWeek,
  localWeek,
  shiftLocalDays,
} from "./time";
import { topicColorStyle } from "./topicColor";
import type { Tracking } from "./useTracking";

/**
 * The week of sessions. It shows what the log recorded and nothing else: no estimate of
 * a missing entry, and no reading that could be read as a measure of attention or of work.
 *
 * The chart is the day view's track, turned on its side: one column for each day, the
 * topic color in a rule outline, and the words beside it that carry every mark.
 */

/**
 * The drawing height the chart is computed against. Positions are then given as
 * percentages, so the chart follows the root font size and keeps its proportions.
 */
const CHART_PX = 416;
/** A short session must stay visible and selectable. */
const MIN_BLOCK_PX = 6;
/** A block this high can hold the topic name, and this high the duration as well. */
const LABEL_PX = 20;
const TIME_PX = 40;
/** The axis never shows less than this, so a busy hour does not fill the chart. */
const MIN_SPAN_HOURS = 6;
const MAX_TICKS = 8;
/** Each one divides 24, so a label always falls on midnight. */
const TICK_STEPS = [1, 2, 3, 4];

const ALL = "all";
const DAYS = 7;

/** One session, placed in the day it starts and cut at midnight. */
interface Block {
  session: Session;
  day: number;
  /** Hours from midnight of the start day. */
  from: number;
  /** Hours from the same midnight, never past 24. */
  to: number;
  /** The session runs past the end of its start day. */
  crosses: boolean;
}

/** The instants of the eight local day boundaries of a week. */
function dayBounds(weekStart: string): number[] {
  const bounds: number[] = [];
  for (let day = 0; day <= DAYS; day += 1) {
    bounds.push(Date.parse(shiftLocalDays(weekStart, day)));
  }
  return bounds;
}

function place(
  sessions: readonly Session[],
  bounds: readonly number[],
): Block[] {
  return sessions.map((session) => {
    const startMs = Date.parse(session.start);
    const endMs = Date.parse(session.end);
    let day = 0;
    while (day < DAYS - 1 && startMs >= bounds[day + 1]) day += 1;
    const dayStart = bounds[day];
    const dayEnd = bounds[day + 1];
    // A day that gains or loses an hour is drawn on the same scale as the other days.
    const hour = (ms: number) => ((ms - dayStart) / (dayEnd - dayStart)) * 24;
    return {
      session,
      day,
      from: hour(startMs),
      to: hour(Math.min(endMs, dayEnd)),
      crosses: endMs > dayEnd,
    };
  });
}

/**
 * The hours the chart shows. It holds only the hours the week records, never less than
 * six, and it does not go past midnight at either end.
 */
function axisOf(blocks: readonly Block[]): {
  from: number;
  to: number;
  step: number;
} {
  let from = 8;
  let to = 18;
  if (blocks.length > 0) {
    from = Math.floor(Math.min(...blocks.map((block) => block.from)));
    to = Math.ceil(Math.max(...blocks.map((block) => block.to)));
    const missing = MIN_SPAN_HOURS - (to - from);
    if (missing > 0) {
      // The missing hours are added before and after the recorded range in equal parts.
      const before = Math.ceil(missing / 2);
      from -= before;
      to += missing - before;
    }
    if (from < 0) {
      to += -from;
      from = 0;
    }
    if (to > 24) {
      from -= to - 24;
      to = 24;
    }
    if (from < 0) from = 0;
  }
  for (const step of TICK_STEPS) {
    const first = Math.floor(from / step) * step;
    const last = Math.ceil(to / step) * step;
    if ((last - first) / step + 1 <= MAX_TICKS) {
      return { from: first, to: last, step };
    }
  }
  return { from: 0, to: 24, step: 4 };
}

const pad = (value: number) => String(value).padStart(2, "0");
const hourLabel = (hour: number) => `${pad(hour)}:00`;

/** What a session says, wherever it is shown. The words carry every mark. */
function notes(block: Block): string[] {
  const { session } = block;
  const out: string[] = [];
  if (session.qualifies) out.push("4 hours or longer");
  if (session.running) out.push("In progress");
  if (session.onBreak) out.push("On a break");
  if (block.crosses) out.push("continues into the next day");
  if (session.stops === 1) {
    out.push(`includes a short stop of ${formatDuration(session.stopMs)}`);
  } else if (session.stops > 1) {
    out.push(
      `includes ${session.stops} short stops, ${formatDuration(session.stopMs)} in total`,
    );
  }
  if (session.possiblyForgotten) out.push("possibly forgotten");
  return out;
}

function describe(block: Block, name: string): string {
  const { session } = block;
  const parts = [
    // "lasting", because a length beside two clock times reads as a third time.
    `${name}, ${formatWeekday(session.start, true)} ${formatClock(session.start)} to ${formatClock(session.end)}, lasting ${formatDuration(session.elapsedMs)}`,
    ...notes(block),
  ];
  return `${parts.join(", ")}.`;
}

export function WeekView({
  tracking,
  anchor,
  setAnchor,
  now,
  openDay,
  openEntries,
}: {
  tracking: Tracking;
  anchor: string;
  setAnchor: (iso: string) => void;
  now: number;
  openDay: (iso: string) => void;
  openEntries: () => void;
}) {
  const [filter, setFilter] = useState(ALL);
  const [selected, setSelected] = useState<string | null>(null);
  const filterId = useId();

  const { start, end } = useMemo(() => localWeek(anchor), [anchor]);
  const week = useMemo(
    () => sliceWeek(tracking.state, start, end, now),
    [tracking.state, start, end, now],
  );

  const topics = tracking.state.topics;
  const keyOf = (subject: Subject) =>
    subject.type === "topic" ? subject.topicId : "stop";
  const shown = week.topics.filter(
    (topic) => filter === ALL || keyOf(topic.subject) === filter,
  );
  const sessions = shown.flatMap((topic) => topic.sessions);

  const bounds = useMemo(() => dayBounds(start), [start]);
  const blocks = place(sessions, bounds);
  const blockOf = new Map(
    blocks.map((block) => [block.session.eventId, block]),
  );
  const axis = axisOf(blocks);
  const span = axis.to - axis.from;
  const ticks: number[] = [];
  for (let hour = axis.from; hour <= axis.to; hour += axis.step) {
    ticks.push(hour);
  }

  const onThisWeek = isSameLocalWeek(anchor, now);
  const today = onThisWeek
    ? bounds.findIndex(
        (bound, day) => day < DAYS && now >= bound && now < bounds[day + 1],
      )
    : -1;
  const nowHour =
    today >= 0
      ? ((now - bounds[today]) / (bounds[today + 1] - bounds[today])) * 24
      : -1;

  const axisSpan = `${hourLabel(axis.from)}–${hourLabel(axis.to)}`;
  const selectedBlock = selected === null ? undefined : blockOf.get(selected);

  // The filter lists every topic, so the user can ask whether a week holds a topic at all.
  const registry: Subject[] = topics.map((topic) => ({
    type: "topic",
    topicId: topic.id,
  }));
  for (const topic of week.topics) {
    if (!registry.some((subject) => keyOf(subject) === keyOf(topic.subject))) {
      registry.push(topic.subject);
    }
  }

  return (
    <>
      <nav className="analytics-nav" aria-label="Week">
        <button
          type="button"
          className="quiet"
          onClick={() => setAnchor(shiftLocalDays(anchor, -DAYS))}
        >
          ‹ Previous
        </button>
        <h2>
          {onThisWeek ? "Week so far · " : ""}
          {formatWeek(start)}
        </h2>
        <button
          type="button"
          className="quiet"
          disabled={onThisWeek}
          onClick={() => setAnchor(shiftLocalDays(anchor, DAYS))}
        >
          Next ›
        </button>
        <button
          type="button"
          className="quiet"
          disabled={onThisWeek}
          onClick={() => setAnchor(new Date(now).toISOString())}
        >
          This week
        </button>
      </nav>

      {onThisWeek && (
        <p className="note">
          Through {formatWeekday(new Date(now).toISOString(), true)},{" "}
          {formatClock(new Date(now).toISOString())}.
        </p>
      )}

      <p className="filter">
        <label htmlFor={filterId}>Topic</label>
        <span className="select-field">
          <select
            id={filterId}
            value={filter}
            onChange={(event) => {
              setFilter(event.target.value);
              setSelected(null);
            }}
          >
            <option value={ALL}>All topics</option>
            {registry.map((subject) => (
              <option key={keyOf(subject)} value={keyOf(subject)}>
                {subjectLabel(topics, subject)}
              </option>
            ))}
          </select>
        </span>
      </p>

      {sessions.length > 0 && (
        <p className="legend">
          {shown.map((topic) => {
            const color = colorOf(topics, topic.subject);
            return (
              <span key={keyOf(topic.subject)}>
                <i
                  className="swatch"
                  aria-hidden="true"
                  data-colored={color !== null || undefined}
                  style={topicColorStyle(color)}
                />
                {subjectLabel(topics, topic.subject)}
                {color === null ? " · no color" : ""}
              </span>
            );
          })}
          <span>
            <i className="sample long" aria-hidden="true" />4 hours or longer
          </span>
          {blocks.some((block) => block.crosses) && (
            <span>
              <i className="sample crosses" aria-hidden="true" />
              Continues into the next day
            </span>
          )}
        </p>
      )}

      <div className="chart-scroll">
        <section
          className="chart"
          aria-label={`Sessions of the week, ${hourLabel(axis.from)} to ${hourLabel(axis.to)}`}
        >
          <div />
          {bounds.slice(0, DAYS).map((bound, day) => {
            const iso = new Date(bound).toISOString();
            return (
              <button
                key={bound}
                type="button"
                className="day-name"
                data-today={day === today || undefined}
                onClick={() => openDay(iso)}
              >
                {formatWeekday(iso)} {new Date(bound).getDate()}
                <span className="hidden"> · open the day timeline</span>
              </button>
            );
          })}

          <div className="hours" aria-hidden="true">
            {ticks.map((hour) => (
              <span
                key={hour}
                style={{ top: `${((hour - axis.from) / span) * 100}%` }}
              >
                {hourLabel(hour)}
              </span>
            ))}
          </div>

          {bounds.slice(0, DAYS).map((bound, day) => {
            // A block keeps a minimum height, so a short session stays visible and can be
            // selected. A block that is tall enough keeps its exact place. Only a block
            // that the minimum height makes taller than it is can move down, and only far
            // enough to clear the block before it. It is drawn above its neighbors, because
            // it can now reach into the block that follows it.
            let taken = 0;
            const own = blocks
              .filter((block) => block.day === day)
              .sort((a, b) => a.from - b.from);
            return (
              <div
                key={bound}
                className="day-column"
                data-first={day === 0 || undefined}
                data-future={
                  (onThisWeek && today >= 0 && day > today) || undefined
                }
                style={{ backgroundSize: `100% ${(axis.step / span) * 100}%` }}
              >
                {own.map((block) => {
                  const exact = ((block.to - block.from) / span) * CHART_PX;
                  const short = exact < MIN_BLOCK_PX;
                  const height = short ? MIN_BLOCK_PX : exact;
                  const start = ((block.from - axis.from) / span) * CHART_PX;
                  let top = short ? Math.max(taken, start) : start;
                  if (top + height > CHART_PX) top = CHART_PX - height;
                  if (top < 0) top = 0;
                  taken = Math.max(taken, top + height + 1);
                  const name = subjectLabel(topics, block.session.subject);
                  const color = colorOf(topics, block.session.subject);
                  const text = describe(block, name);
                  return (
                    <button
                      key={block.session.eventId}
                      type="button"
                      className="session"
                      data-colored={color !== null || undefined}
                      data-short={short || undefined}
                      data-long={block.session.qualifies || undefined}
                      data-crosses={block.crosses || undefined}
                      data-forgotten={
                        block.session.possiblyForgotten || undefined
                      }
                      aria-pressed={block.session.eventId === selected}
                      aria-label={text}
                      title={text}
                      style={{
                        ...topicColorStyle(color),
                        top: `${(top / CHART_PX) * 100}%`,
                        height: `${(height / CHART_PX) * 100}%`,
                      }}
                      onClick={() => setSelected(block.session.eventId)}
                    >
                      {height >= LABEL_PX && (
                        <span className="chip" aria-hidden="true">
                          {name}
                        </span>
                      )}
                      {height >= TIME_PX && (
                        <span className="chip figure" aria-hidden="true">
                          {formatDuration(block.session.elapsedMs)}
                        </span>
                      )}
                    </button>
                  );
                })}
                {day === today &&
                  nowHour >= axis.from &&
                  nowHour <= axis.to && (
                    <span
                      className="mark-now-row"
                      aria-hidden="true"
                      style={{
                        top: `${((nowHour - axis.from) / span) * 100}%`,
                      }}
                    />
                  )}
              </div>
            );
          })}
        </section>
      </div>

      <p className="note">
        Axis <span className="figure">{axisSpan}</span>
        {sessions.length === 0
          ? " · no session is recorded, so the axis shows a default day."
          : filter === ALL
            ? " · the hours this week holds."
            : " · the hours this topic holds in this week."}
      </p>

      {sessions.length > 0 && (
        <div className="panel" role="status" aria-live="polite">
          {selectedBlock === undefined ? (
            <span>
              Select a session in the chart or the list to see its details.
            </span>
          ) : (
            <>
              <span>
                <strong>
                  {subjectLabel(topics, selectedBlock.session.subject)}
                </strong>{" "}
                · {formatWeekday(selectedBlock.session.start, true)}{" "}
                <span className="figure">
                  {formatClock(selectedBlock.session.start)}–
                  {formatClock(selectedBlock.session.end)}
                </span>{" "}
                ·{" "}
                <span className="figure">
                  {formatDuration(selectedBlock.session.elapsedMs)}
                </span>
                {notes(selectedBlock).length > 0
                  ? ` · ${notes(selectedBlock).join(" · ")}`
                  : ""}
              </span>
              {selectedBlock.crosses && (
                <span className="note">
                  The chart draws the part until midnight. The session stays in
                  this week and is counted one time.
                </span>
              )}
              {selectedBlock.session.possiblyForgotten && (
                <span className="note">
                  A recorded stretch is longer than 12 hours. It stays in the
                  readings. Review the entries to correct a switch that was
                  possibly not logged.
                </span>
              )}
              <span className="row">
                <button type="button" className="quiet" onClick={openEntries}>
                  Correct entries
                </button>
              </span>
            </>
          )}
        </div>
      )}

      {shown.map((topic) => {
        const color = colorOf(topics, topic.subject);
        const name = subjectLabel(topics, topic.subject);
        return (
          <section className="topic-week" key={keyOf(topic.subject)}>
            <h3>
              <Swatch color={color} />
              {name}
            </h3>
            <dl className="readings">
              <div>
                <dt>Recorded</dt>
                <dd>{formatDuration(topic.recordedMs)}</dd>
              </div>
              <div>
                <dt>Longest session</dt>
                <dd>{formatDuration(topic.longestMs)}</dd>
              </div>
              <div>
                <dt>4 hours or longer</dt>
                <dd>
                  {topic.qualifying}
                  {topic.qualifyingPossiblyForgotten && (
                    <span className="qualifier">
                      includes a possibly forgotten session
                    </span>
                  )}
                </dd>
              </div>
            </dl>
            <ul className="sessions">
              {topic.sessions.map((session) => {
                const block = blockOf.get(session.eventId);
                if (block === undefined) return null;
                return (
                  <li key={session.eventId}>
                    <button
                      type="button"
                      className="pick"
                      aria-pressed={session.eventId === selected}
                      onClick={() => setSelected(session.eventId)}
                    >
                      <span className="stamp">
                        {formatWeekday(session.start)} ·{" "}
                        {formatClock(session.start)}–{formatClock(session.end)}
                      </span>
                      <span className="subject">
                        {notes(block).join(" · ")}
                      </span>
                      <span className="duration">
                        {formatDuration(session.elapsedMs)}
                      </span>
                      <span className="hidden">{describe(block, name)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      {sessions.length === 0 &&
        (filter === ALL ? (
          <p className="no-sessions">
            No sessions are recorded for this week.
            <span className="note">
              Konzendi shows only what it recorded. An empty week does not mean
              that no work happened.
            </span>
          </p>
        ) : (
          <p className="no-sessions">
            No sessions are recorded for this topic in this week.
          </p>
        ))}

      {shown.some((topic) =>
        topic.sessions.some((session) => session.possiblyForgotten),
      ) && (
        <p className="note" data-forgotten="true">
          One session or more holds a stretch longer than 12 hours. Nothing
          ended it, so a switch was possibly not logged. It is drawn hatched and
          stays in the readings above. Correct it in Entries.
        </p>
      )}

      <p className="note">
        Session lengths include stops of up to 15 minutes when the same topic
        continues. A switch to another topic starts a new session. Only recorded
        sessions are shown. Konzendi does not estimate missing entries.
      </p>
    </>
  );
}
