# Phase 24 — Entry durations

[Roadmap](../ROADMAP.md#delivery-phases) · prev: [Phase 23](phase-23-statistics-v2.md) · next: none

**Depends on:** [Phase 2](phase-2-tracking-implementation.md), [Phase 4](phase-4-timeline-analytics.md)  
**Effort:** L  
**Complexity:** L  
**Readiness:** Implementation-ready

## Outcome and scope

The owner requested on 17 September 2026: "I want to see the duration of how long I was on a
topic in the entries page, currently we only see the start datetime."

Today each row in `Recent entries` shows the start time, the subject, and the controls. To
know how long an entry lasted, the user must compare the row with the row above it, or open
Analytics. After this phase, each row that opened an interval also shows the duration of that
interval. The running entry shows the time so far.

The scope includes:

- a pure function in `src/core/` that finds the interval that each entry opened;
- a duration in each applicable row of `src/EntriesView.tsx`;
- the related style in `src/App.css`;
- Vitest tests for the function;
- a brief entry in `CHANGELOG.md`.

Out of scope:

- a change to the fold, to an event kind, or to an event payload;
- a duration in the tracking view, the quick switcher, or Analytics. They already show the
  elapsed time or the interval lengths;
- a warning for a long entry, such as the Analytics "possibly forgotten" mark;
- a total per topic or per day in the entry list;
- an edit of the duration. The user changes a duration with `adjust` on this entry or on the
  next entry, as before.

## Decisions and evidence

### Decided by the owner, 17 September 2026

| Area | Decision | Rationale |
| --- | --- | --- |
| Duration in the entry list | The entry list shows how long each entry lasted, in addition to its start. | The owner's request. The start time alone does not show the length. |

### Design decisions of this document

These choices follow from the request and the existing behavior. The owner can change them
before implementation.

| Area | Decision | Rationale |
| --- | --- | --- |
| Source of the duration | The duration of a row is the length of the interval that the entry opened in `state.timeline`, from `start` to `end`. The core does not calculate a second timeline. | The fold already decides the interval boundaries. Analytics uses the same intervals, so the two views agree. A retime, an undo, or a restore changes the fold, and the durations change with it. |
| Revoked entry | No duration. | A revoked entry opens no interval. The row is already struck through. |
| Repeated entry | No duration. | An entry with the same subject as the previous effective entry opens no interval ([Phase 1](phase-1-tracking-design.md), coalesce rule). The time belongs to the earlier row, which shows the full length. |
| Zero-length entry | No duration. | `state.timeline` omits a zero-length interval. Analytics does not show it either. |
| Running entry | The time since its start, followed by `so far`, for example `1:05 so far`. The value updates with the existing `useNow(30_000)` clock of the view. | The user sees that the entry did not end. A 30-second update is sufficient for hours and minutes, and adds no timer. |
| Stop entries | A stop shows its duration, the same as a topic. | The list shows every entry. The length of a stop is useful when the user corrects a missed switch. Analytics continues to measure topics only ([Phase 13](phase-13-stop-replaces-pause.md)). |
| Format | `formatDuration` in `src/time.ts`: seconds under one minute, then `h:mm`. | Analytics uses this format. The same length reads the same in both views. |
| Placement | After the subject name and the `corrected` note, before `adjust`, in a monospace style with tabular figures, the same as `.stamp`. | The eye reads start, subject, then length. Tabular figures keep the durations aligned in the column. |
| Accessible name | The duration element has an accessible text such as `lasted 1:30` or `running for 1:05`. | A screen reader does not read a bare `1:30` as a duration. |

The application does not store a duration. The function derives it from the log each time, so
no data changes.

### Verified facts

These facts come from the tree on 17 September 2026:

- `EntriesView` in `src/EntriesView.tsx` shows `formatStamp(entry.effectiveAt, now)`, the
  mark, the color swatch, the subject label, the `corrected` note, and the controls. It shows
  no end and no duration.
- `EntriesView` already calls `useNow(30_000)`.
- `foldLog` in `src/core/fold.ts` returns `entries` (every tracking event, in timeline order,
  revoked ones included), `timeline` (intervals of non-zero length, the last one open), and
  `current`. Each `Interval` has `eventId`, the id of the entry that opened it.
- The fold skips revoked entries and entries that repeat the previous subject when it makes
  intervals. It removes zero-length intervals from `timeline`.
- `formatDuration(ms)` in `src/time.ts` is used by `src/AnalyticsView.tsx`.

## Work packages

- [ ] **Map entries to intervals.** Add a pure function to `src/core/` that takes
  `state.timeline` and returns the interval for an entry id, or nothing. It must import neither
  React nor Tauri, and it must not read the clock. Complete when Vitest tests show the correct
  result for: a closed interval, the open interval, a revoked entry, an entry that repeats the
  previous subject, a zero-length entry, and an entry whose start was retimed.
- [ ] **Show the duration.** In `src/EntriesView.tsx`, show the duration for each row that has
  an interval, as decided above. For the open interval, use `now` as the end and add `so far`.
  Complete when the acceptance checks 1 to 6 pass.
- [ ] **Style the duration.** Add a class in `src/App.css` with the monospace, tabular, and
  soft ink style of `.stamp`. The row must not overflow at the minimum window width
  ([Phase 18](phase-18-window-content-fit.md)). Complete when check 7 passes.
- [ ] **Record the change.** Add a brief entry under `### Added` in `CHANGELOG.md`. Complete
  when the entry exists.

## Acceptance and verification

Do the checks on Linux/X11 with the
[desktop-testing](../../.claude/skills/desktop-testing/SKILL.md) procedure. Use a separate
`XDG_DATA_HOME`. Do not open the owner's application-data directory.

| # | Criterion | How it is checked | Actual result |
| --- | --- | --- | --- |
| 1 | A closed entry shows its length | Record topic A, then topic B 90 minutes later, with a back-dated missed switch. Open Entries. The row of A shows `1:30` | Not run |
| 2 | The running entry shows the time so far, and it updates | Read the row of B. It shows a value with `so far`. Wait more than one minute and read it again. The value is larger | Not run |
| 3 | Revoked and repeated entries show no duration | Undo an entry. Add a missed switch to the subject that is already running. Neither row shows a duration. The earlier row shows the full length | Not run |
| 4 | A correction changes the durations | Use `adjust` on B to move it 15 minutes earlier. The row of A shows `1:15` | Not run |
| 5 | A stop shows its duration | Stop, then select a topic. The stop row shows its length | Not run |
| 6 | Entries and Analytics agree | For one day, compare the durations in Entries with the segment lengths in Analytics | Not run |
| 7 | The row fits a narrow window | Resize the window to its minimum width. Take a screenshot. The duration and the controls are visible and nothing is cut off | Not run |
| 8 | No event format changes | Compare `src/core/events.ts` and `src/core/tracking.ts` before and after. The stored log of checks 1 to 5 contains only existing event kinds | Not run |
| 9 | The project checks pass | `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, then `cargo fmt --check`, `cargo clippy -- -D warnings`, and `cargo test` in `src-tauri/` | Not run |

Record the actual result of each row when you do the check, including failures. Record what was
not verified.

## Rollout and rollback

Local delivery. Nothing is published. The phase adds no event kind and does not change a
payload or the fold, so an older build reads a log from this build without a change. To roll
back, remove the duration from `EntriesView`, the style, and the core function. No data needs
recovery.
