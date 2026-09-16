# Phase 4 — Timeline and first analytics

[Roadmap](../ROADMAP.md#delivery-phases) · prev: [Phase 3](phase-3-quick-access.md) · next: [Phase 5](phase-5-validation-trial.md)

**Depends on:** [Phase 2](phase-2-tracking-implementation.md)  
**Effort:** M  
**Complexity:** M  
**Readiness:** Implementation-ready

> **Superseded in part by [Phase 13](phase-13-stop-replaces-pause.md).** This phase drew a lane
> for pauses and summed paused time, and named its count `Changes`. A pause is the only way to
> stop tracking, so that sum measured absence. Stopped time is now absence here too — no lane, no
> sum, no mark — and the count is `Switches`, the entries that started work on a topic. Every
> other decision, and the record below of what was decided and verified on 12 September 2026,
> stands as written.

## Investigation gate

The owner changed the possibly forgotten threshold from more than eight hours to more
than 12 hours on 16 September 2026 during [Phase 14 discovery](phase-14-further-statistics.md).
Exactly 12 hours is not flagged. This applies to the current day view. The original
eight-hour decisions and verification below remain a historical record.

Resolved. The user decided the four questions on 12 September 2026, against the log recorded on
the development machine by Phase 2 and Phase 3. [Q07](../OPEN_QUESTIONS.md) stays open: no score
and no effort level is decided or implemented here.

| # | Question | Decision |
| --- | --- | --- |
| 1 | Which analytics are worth showing first | The timeline plus three readings for the shown day: time per topic, number of changes, and longest uninterrupted stretch. See [Accepted decisions](#accepted-decisions). |
| 2 | What span the timeline shows | One local day, clipped at midnight, with day navigation and today as the default. |
| 3 | How topics are distinguished, given Phase 6's colour rule | One lane per topic and one for pauses. Position identifies the subject; `live` and `rest` carry state only. |
| 4 | What the view does with an interval that ran for hours because nothing ended it | It is drawn as recorded, marked as possibly forgotten, and counted. Nothing is invented and nothing is silently dropped. |

## Outcome and scope

A day view: a lane timeline of topics and pauses for one local day, and the smallest set of
readings that earns its place. The purpose is to make sustained logging worth doing during the
[Phase 5](phase-5-validation-trial.md) trial.

Out of scope: the score and effort levels ([Q07](../OPEN_QUESTIONS.md)), trends and comparisons
across days, reports, export, editing from the timeline, zoom and pan, and anything needing data
the tracking phase does not record. The view reads the log and appends no event.

## Decisions and evidence

### Evidence: the recorded log

The decisions were made against the real log on the development machine, not against the
candidate list. It held 32 records from 6 to 10 September 2026 on one device, which the fold
turns into 24 intervals:

| Observation | Number |
| --- | --- |
| Intervals | 24 |
| Shorter than 5 minutes | 19 |
| Longer than 8 hours | 2 (one of 75 h, one open pause of 42 h) |
| Crossing local midnight | 2 |
| Median interval | 0.09 min |
| Local days touched | 2 |

Three facts follow, and they shape the plan more than the candidate list does:

- **Short intervals dominate.** Most of this log is bursts of verification clicks. A strictly
  proportional day bar renders 19 of 24 intervals as invisible slivers, and a switch rate
  computed over such a day says more about testing than about working.
- **Nothing ends an interval except the next entry.** Closing the window does not stop tracking,
  so the log honestly holds a 75-hour interval across three days. Forgotten logging is the normal
  case, not an edge case, and the view must handle it without correcting the log.
- **Intervals cross midnight.** A day view must clip, and the clipping must be visible.

This evidence is a developer's own test log, not usage data. It is enough to decide what the view
must survive; it is not enough to judge whether an analytic is useful. That judgement belongs to
[Phase 5](phase-5-validation-trial.md).

### Accepted decisions

| Area | Decision | Gate question |
| --- | --- | --- |
| Analytics set | The timeline, plus time per topic, the number of changes recorded in the day, and the longest uninterrupted stretch on one topic. Nothing else. | 1 |
| Span | One local day at a time. Previous, next, and today; next is unavailable on today. | 2 |
| Scale | Fixed 00:00 to 24:00, so two days are comparable by eye. | 2 |
| Minimum segment width | A segment thinner than 2 px is drawn at 2 px, so a short interval stays visible and reachable. Width is therefore not exactly proportional below about four minutes. | 1, 2 |
| Lanes | One lane per subject that appears in the day, topics in creation order, pauses last. | 3 |
| Colour | `live` for a topic segment, `rest` for a pause, `rule` for the axis. No per-topic hue and no new token. | 3 |
| Possibly forgotten | An interval longer than eight hours is marked, in the timeline and in the readings that include it. The threshold is a display rule, not data. | 4 |
| Clipping | A segment that starts before the day or ends after it is marked as continuing, and only the part inside the day is measured. | 2, 4 |
| Where it computes | In `src/core/`, as a pure function of the folded state plus explicit day bounds and a `now` value. | 1 |
| Timezone | The core takes instants and never resolves a local day itself; `src/time.ts` computes the day bounds. | 2 |

### Rationale

**The smallest set of readings.** Each accepted reading is a sum or a count over the drawn
segments, so a user can check it against the picture above it. The rejected candidates —
median uninterrupted interval per topic, and the topic pairs switched between most often — need
more than two days of real logging before they mean anything, and the pair matrix is the first
figure that invites a causal reading. They stay candidates for after
[Phase 5](phase-5-validation-trial.md).

**A day, not a rolling window.** A fixed local day can be compared with another day and matches
how a user talks about their own time. A rolling 24 hours always shows the current interval
without navigation, but no two views are comparable. A continuous pannable strip is the largest
interaction in the phase and makes the short-interval problem worse.

**Lanes instead of topic colours.** [Phase 6](phase-6-application-theme.md#accepted-direction-readout)
decided that colour is state, and recorded that this phase's timeline would use `live` and `rest`
for its segments. The concept discussion proposes a coloured timeline of topics, which conflicts
with that rule. Lanes settle the conflict without weakening either side: position carries identity,
colour carries state, the thirteen roles stand, and no per-topic hue needs its own contrast
measurement or a non-colour equivalent. Fragmentation stays visible, because a day split between
three topics shows as gaps in three lanes.

**Marking a forgotten interval rather than trimming it.** The log is the truth, and the
project's rules forbid presenting invented time as recorded. Capping a 75-hour interval at an
assumed end of day would fabricate an end that no event holds. Excluding a marked interval from
the readings would make the numbers disagree with the picture and hide the mistake the user needs
to see. Marking it says what happened, keeps the reading honest about what it contains, and points
at the correction the entry list already offers.

**Eight hours as the threshold.** It is longer than any plausible uninterrupted stretch at a
computer and shorter than an overnight gap, so it separates a forgotten switch from real work
without needing a setting. It is a heuristic, not a measurement, and it changes nothing that is
stored.

**Wording is part of the work.** The readings describe what was logged, not what the user did.
"Time per topic" is time recorded against a topic, not time worked; a marked stretch is "possibly
forgotten", not idle. No reading is called focus, productivity, or attention.

### Rejected alternatives

- **Per-topic hues in one bar.** The concept's version, rejected under gate question 3: it
  reopens Phase 6's colour rule, adds tokens, and needs a contrast check per hue and a non-colour
  cue, for identity that position already carries.
- **A single bar coloured by state with labels on segments.** With 19 sub-five-minute intervals in
  the sample day, the labels do not fit and the bar cannot answer which topic.
- **Capping a long interval at an assumed end of day.** Rejected under gate question 4; it
  invents time.
- **Excluding marked intervals from the readings.** Cleaner figures, at the cost of numbers that
  do not match the drawing and a rule the user must know to read them.
- **Median uninterrupted interval and a switch-pair matrix.** Deferred, not refused. There is no
  data to judge them against yet.
- **Resolving the local day inside `src/core/`.** The core would then depend on the host timezone,
  which breaks the rule that a fold is a total function of its input.

## Work packages

- [x] **Add the day slice to the domain core** (`src/core/day.ts`). A pure function from
  `TrackingState`, day bounds, and `now` to lanes of clipped segments and the day's readings.
  Each segment reports its clipped start and end, whether it is still running, and whether the
  whole interval exceeds the threshold. Complete when the function is pure and total, imports
  neither React nor Tauri, resolves no timezone of its own, and exports the types the view needs.

- [x] **Test the day slice** (`src/core/day.test.ts`). An interval crossing midnight in both
  directions, an interval spanning a whole day, an open interval clipped at `now`, the marking
  threshold at and above the boundary, a day with nothing in it, lane order, and the readings
  against hand-computed sums. Complete when acceptance checks 1 to 8 are covered by tests that
  fail if the rule is removed.

- [x] **Add the local-day helpers** (`src/time.ts`). Bounds of the local day holding an instant,
  the day before and after, whether a day is today, and a day label. Complete when the view
  resolves days only through these and the core receives instants.

- [x] **Build the analytics view** (`src/AnalyticsView.tsx`, `src/App.css`). The lane timeline on a fixed
  24-hour axis, the day navigation, the three readings, the empty day, and the marking of
  possibly forgotten and continuing segments. Complete when every state is reachable from the
  header, and colour is not the only carrier of state or of a mark.

- [x] **Reach it from the window** (`src/App.tsx`). An `Analytics` entry in the header navigation
  beside `Entries` and `Topics`, with the same back control. Complete when the view opens and closes
  without touching the tracking path.

- [x] **Run the checks and record the results.** The root and `src-tauri/` checks, the desktop
  walkthrough under a private display, and a contrast measurement of the new surface in both
  modes. Complete when each row of
  [Acceptance and verification](#acceptance-and-verification) has an actual result.

## Acceptance and verification

| # | Criterion | How it is checked | Actual result |
| --- | --- | --- | --- |
| 1 | An interval crossing midnight appears in both days, clipped, and is marked as continuing | Core unit test | Passed. `day.test.ts` folds one interval from 22:00 to 01:00 and reads both days: the seventh ends at 00:00 marked `intoLater`, the eighth starts at 00:00 marked `fromEarlier`, one hour long. |
| 2 | An interval covering a whole day fills that day's lane and is measured as 24 hours there | Core unit test | Passed. A four-day interval measures exactly 24 h in the day it covers, marked at both ends. |
| 3 | The open interval is clipped at `now`, and a later `now` lengthens it | Core unit test with two `now` values | Passed. The running interval measures 1:30 at 04:00 and 3:30 at 06:00, reported `open`. |
| 4 | An interval longer than eight hours is marked; one of exactly eight hours is not | Core unit test at the boundary | Passed. Exactly eight hours is not marked; eight hours and one millisecond is. |
| 5 | Time per topic equals the sum of that topic's clipped segments in the day | Core unit test against hand-computed sums | Passed. 2:30 + 1:00 + 0:30 against hand-computed sums, and 3:30 recorded on topics. |
| 6 | The number of changes counts the entries that opened an interval inside the day, and nothing that opened outside it | Core unit test | Passed. Three openings in the day, one the evening before; an entry at midnight counts in the day it opens. |
| 7 | The longest stretch is the longest single topic segment in the day, and says so when it is a marked one | Core unit test | Passed. A three-hour pause does not win over a one-hour topic stretch, and a marked stretch reports `possiblyForgotten`; the view then prints `possibly forgotten` under the figure. |
| 8 | A day with no recorded interval yields no lane and zero readings, not an error | Core unit test | Passed. No lane, all readings zero, `longest` null, no error. |
| 9 | The analytics view is reachable from the header and returns to the tracking screen | Desktop walkthrough | Passed. `Analytics` in the header opened the view; `‹ Back` returned to the tracking screen unchanged. |
| 10 | Previous, next, and today move the day; next is unavailable on today | Desktop walkthrough | Passed. Two presses of `Previous` reached Thu, Sep 10; `Today` returned to Sat, Sep 12, where `Next ›` and `Today` are both unavailable. |
| 11 | A sub-minute interval is visible and has an accessible description | Desktop walkthrough with the recorded log, which holds 19 of them | Passed. The 4-second interval of 10 September draws as a 2 px mark and reads `Konzentri development, 21:01 to 21:01, lasting 4s.` |
| 12 | The view appends no event: the log is byte-identical after using it | SHA-256 of the log file before and after | Passed. SHA-256 `9e9db77d…` before and after the walkthrough, 32 lines both times. |
| 13 | State and marks are carried by text as well as colour | Desktop walkthrough in both modes, and a reading of the markup | Passed. Each lane carries ▶ or ❙❙ and its name; a marked segment is hatched and also described in words, in the segment text and in the note below the readings. |
| 14 | New surface meets WCAG 2.2 AA: 4.5:1 for text, including the axis hour labels, and 3:1 for the segments that carry the data | Contrast measurement on rendered output in light and dark | Passed as amended. Measured on the rendered window: topic segment 8.01:1 light / 7.12:1 dark against the track, pause segment 6.12:1 / 7.36:1, axis hour labels 4.73:1 / 5.74:1, lane totals and reading labels 5.26:1 / 7.45:1. The three-hour gridlines are `rule`, the hairline used everywhere else in the window, at 1.95:1 / 1.42:1; they are not claimed at 3:1, because the labelled hours carry the reading. The criterion was corrected to say so rather than left implying the gridlines pass. |
| 15 | No reading is worded as productivity, focus, or attention | Reading of the rendered wording | Passed. The readings are `Recorded on topics`, `Recorded as paused`, `Changes`, and `Longest stretch`, under the sentence "These are sums of what is logged on this day, not a measure of work." No wording names productivity, focus, or attention. |
| 16 | The existing checks still pass and `src/core/` imports neither React nor Tauri | `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `cargo fmt --check`, `cargo clippy -- -D warnings`, `cargo test`, import check | Passed. 50 Vitest tests in 5 files, Biome clean, `tsc` clean, build clean, `cargo fmt` clean, Clippy clean, 5 Rust storage tests; no file under `src/core/` names React or Tauri. |

### Verification evidence — 12 September 2026

Automated checks ran at the repository root and in `src-tauri/`: `npm run typecheck`,
`npm run lint`, `npm test` (50 tests in 5 files), `npm run build`, `cargo fmt --check`,
`cargo clippy -- -D warnings`, and `cargo test` (5 tests). All passed.

The desktop walkthrough ran the development build under a private Xvfb display on Linux/X11,
driven by `xdotool`, with a screenshot after every step. It used the real log on the development
machine, because the point was to see the view against data it did not choose: 32 records, three
topics, 19 intervals under five minutes, one interval of 75 hours, and an open pause. Only reads
were exercised, and check 12 proves it.

| Desktop step | Actual result |
| --- | --- |
| Open `Analytics` | Today: one lane, the open pause drawn from midnight to the clock, hatched, with the note naming it. Readings 0s on topics, 15:55 paused, 0 changes, longest stretch none. |
| `Previous` twice | Four lanes in creation order with pauses last: 0:31, 20:30, 4s, and 2:59. Readings 21:01 on topics, 2:59 paused, 7 changes, longest 20:30 marked `possibly forgotten`. |
| Hover the 4-second segment | `Konzentri development, 21:01 to 21:01, lasting 4s.` The mark is 2 px wide and is still described. |
| Hover the 75-hour segment | `OncoJournal MR reviews, 00:00 to 20:29, lasting 20:30, continues from the day before, longer than 8 hours, possibly forgotten.` |
| Switch appearance to Light | The same reading in both modes; segment and text contrast measured, see check 14. The stored preference was set back to `system` afterwards. |
| `Today`, then `‹ Back` | Returned to today, then to the tracking screen, which was unchanged. |
| Hash the log | Unchanged, 32 lines. |

Two wordings were corrected during the walkthrough, because the rendered text said more than the
data supports: the longest-stretch reading now prints `possibly forgotten` under the figure when
nothing ended that stretch, and a segment's description says `lasting 20:30` rather than putting a
length beside two clock times, where it read as a third time.

Not verified by this phase: behaviour on a physical display, on Wayland, or on any other
platform; the packaged build, which this phase does not change; a local day of 23 or 25 hours,
because the bounds are built from calendar parts but no such day was available to render; and
whether these readings are useful over real working weeks, which is
[Phase 5](phase-5-validation-trial.md)'s subject. The screenshots were written to the session
scratch directory and are not repository data.

## Rollout and rollback

Local delivery; nothing is published. Rollback is removing the view, its core module, and the
navigation entry. The view reads the log and writes nothing, so removing it cannot lose tracking
data, and no event kind, payload, or stored file changes in this phase. A log written before this
phase is read unchanged after it.
