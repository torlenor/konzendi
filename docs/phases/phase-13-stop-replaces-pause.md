# Phase 13 — Stop replaces pause

[Roadmap](../ROADMAP.md#delivery-phases) · prev: [Phase 12](phase-12-logo-design.md) · next: [Phase 14](phase-14-further-statistics.md)

**Depends on:** [Phase 2](phase-2-tracking-implementation.md), [Phase 4](phase-4-timeline-analytics.md)  
**Effort:** L  
**Complexity:** L  
**Readiness:** Implementation-ready

## Investigation gate

Resolved. The user decided this on 12 September 2026, after the
[Phase 4](phase-4-timeline-analytics.md) analytics made the problem visible. This resolves
[Q22](../OPEN_QUESTIONS.md) and changes nothing about [Q05](../OPEN_QUESTIONS.md)'s mechanics.

| # | Question | Decision |
| --- | --- | --- |
| 1 | Is there another way to stop recording than a pause? | No. The vocabulary has eight kinds, and only `focus.started` and `focus.paused` open an interval. [Phase 1](phase-1-tracking-design.md#accepted-decisions) already recorded it: "There is no separate stop action. Pause is the only way to have nothing active, and ending the working day is a pause." |
| 2 | Should a second state be added for ending the day? | No. There is one way to stop, and it is called Stop. The word follows the decision instead of contradicting it. |
| 3 | How do the analytics treat time that is not on a topic? | As absence: no lane, no sum, and no mark. [Phase 1](phase-1-tracking-design.md#tracking-model) delegated this presentation question to Phase 4, whose first answer drew it as a subject. |

## Outcome and scope

One state for "not working on a topic", named Stop everywhere the user can read it, and analytics
that measure topics only. The problem this fixes was visible in the owner's own log: a stop
opened on 10 September at 21:01 was still running 42 hours later, and the analytics reported
"Recorded as paused 15:55" for a day in which nothing was tracked, with the stretch marked as
possibly forgotten when nothing had been forgotten.

In scope: the word, its mark, the quick-switcher keystroke, and the analytics treatment.

Out of scope: a new event kind, a second not-working state, automatic stopping after idle time,
reminders, and any change to how intervals are folded. Nothing in the stored log changes.

## Decisions and evidence

### Accepted decisions

| Area | Decision | Gate question |
| --- | --- | --- |
| The word | Pause becomes Stop, and Paused becomes Stopped, in the window, the quick switcher, the tray, the entry list, and failure messages. | 2 |
| The stored kind | `focus.paused` keeps its name. The log is append-only and the meaning of the event has not changed, so renaming it would need a second kind and a synonym forever. | 2 |
| Code naming | `src/core/` keeps `pause` in the `Subject` type and the builder, because those follow the stored kind. The words the user reads are owned by the presentation layer, as Phase 2 already decided for the unknown-topic placeholder. | 2 |
| The mark | `■`, replacing `❙❙`. A pause glyph on a control named Stop is a contradiction a user notices. | 2 |
| Quick-switcher key | `s`, replacing `p`, so the keystroke matches the word. | 2 |
| Analytics | A stop is absence: no lane, no sum, no possibly-forgotten mark. It shows as the gap between two stretches. | 3 |
| Readings | `Recorded as paused` is removed. `Changes` becomes `Switches` and counts the entries that started work on a topic inside the day; a stop is not a switch. | 3 |
| The elapsed reading | The window keeps counting while stopped, and reads `Stopped · since <time>`. How long you have not been tracking is worth seeing, and it is the one thing that says the log is stale. | 2 |

### Rationale

**One state, not two.** A separate stop event would let the analytics tell a coffee break from
the end of a day, which is genuinely interesting. It would also add a ninth kind, a fold rule, a
control on every surface, and a decision for the user every time they step away — for a
distinction the product has no use for yet. Phase 1 chose one state deliberately; this phase
makes the naming honest instead of reversing the choice. If the distinction is ever wanted, it
arrives as a new kind and an additive change to the log, which the store already allows.

**Stopped time is not data.** The sum "Recorded as paused 15:55" asserted that a state was
observed for sixteen hours. Nothing was observed: the user stopped and went away. Drawing it as a
lane gave absence the same standing as work, and the eight-hour mark fired on it, which turned a
correct log into an apparent mistake. Leaving it out states exactly what the log supports, and
the gap in the lanes is visible without being measured.

**Switches, not changes.** With stops excluded, the count is the number of times work on a topic
started, which is the thing the product exists to show. Counting a stop as a change would inflate
the figure with the act of walking away.

### Rejected alternatives

- **A ninth event kind for stopping.** Rejected under gate question 2; see the rationale above.
- **Keeping the pause lane and its sum.** Rejected under gate question 3. The figure describes
  absence, and no wording makes it meaningful.
- **Treating a long stop as the end of the day by a threshold.** Not needed once stopped time is
  absence: the threshold would only decide how to draw something that is no longer drawn.
- **Renaming the `focus.paused` kind.** The log on disk would keep the old name, so the code would
  carry both names for no gain.
- **Stopping the elapsed clock while stopped.** A frozen reading hides how stale the log is, and
  the large reading is what Phase 1 requires to notice an implausible number.

## Work packages

- [x] **Make stopped time absence in the core** (`src/core/day.ts`). Measure topic intervals only;
  drop the pause lane, `pausedMs`, and the mark on stops; rename `changes` to `switches` and count
  the topic entries opened inside the day. Complete when the module measures no subject other than
  a topic and stays pure and total.

- [x] **Test the rule** (`src/core/day.test.ts`). A stop between two stretches leaves a gap and is
  not summed; a stop of four days is not marked; a day holding only a stop is empty; a stop is not
  counted as a switch. Complete when acceptance checks 1 to 4 are covered by tests that fail if the
  rule is removed.

- [x] **Change the word and the mark** (`src/actions.ts`, `src/TrackView.tsx`, `src/QuickView.tsx`,
  `src/useTray.ts`, `src/EntriesView.tsx`, `src/useTracking.ts`, `src/App.tsx`, `src/App.css`).
  Stop, Stopped, `■`, the `s` keystroke, and the state attribute. Complete when no surface reads
  "pause" and the only remaining uses of the word are the stored kind and the core type that
  follows it.

- [x] **Reword the analytics** (`src/AnalyticsView.tsx`). Remove the paused reading, rename the
  count to `Switches`, and say in the note that stopped time is not measured. Complete when the
  view names no figure it does not compute.

- [x] **Run the checks and record the results.** Root and `src-tauri/` checks, and a desktop
  walkthrough against a temporary data directory so the owner's log is not written to. Complete
  when each row below has an actual result.

## Acceptance and verification

| # | Criterion | How it is checked | Actual result |
| --- | --- | --- | --- |
| 1 | A stop between two stretches is a gap: not a lane, not summed | Core unit test, and the desktop walkthrough | Passed. Two stretches of 2:29 and 0:30 with a 54-second stop between them read as `0:03` recorded, not `0:04`. |
| 2 | A stop is never marked as possibly forgotten, however long it runs | Core unit test at four days | Passed. |
| 3 | A day that holds only a stop is empty, and says so | Core unit test, and the desktop walkthrough | Passed. Today, covered only by the stop opened on 10 September, reads "No topic is recorded on this day." |
| 4 | A stop is not counted as a switch | Core unit test | Passed. Two switches for a day holding two topic entries and one stop. |
| 5 | Stop appends exactly one `focus.paused` and no new kind | Inspect the log after pressing Stop | Passed. One line, kind `focus.paused`. |
| 6 | No surface reads "pause" | Read the window, the quick switcher, and the source | Passed. The window, the quick switcher, the entry list, and the failure message all read Stop or Stopped; the only remaining uses are the stored kind and the core type named after it. |
| 7 | The mark is `■` and renders in the bundled face | Desktop walkthrough | Passed, in the window and in the quick switcher. |
| 8 | The quick switcher offers Stop on `s` | Desktop walkthrough | Partly. The row reads `s` `■ Stop` and its action appends a stop. The keystroke itself could not be exercised: under a private X server with no window manager the popup never takes keyboard focus, and neither `s` nor the old `p` reaches it. |
| 9 | The analytics name no figure they do not compute | Read the rendered view | Passed. Recorded on topics, Switches, Longest stretch. |
| 10 | The owner's log is not written to by this verification | SHA-256 before and after; a temporary `XDG_DATA_HOME` for the walkthrough | Passed. Unchanged, 32 lines; the walkthrough wrote 5 records to the scratch store. |
| 11 | The existing checks still pass | `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `cargo fmt --check`, `cargo clippy -- -D warnings`, `cargo test` | Passed. 53 Vitest tests in 5 files, 5 Rust tests, no diagnostics. |

### Verification evidence — 12 September 2026

The desktop walkthrough ran the development build under a private Xvfb display with
`XDG_DATA_HOME` pointed at the session scratch directory, so every click was recorded into a
throwaway store. It created a topic, stopped, resumed, and stopped again, then read the analytics
for that day. The owner's own log was opened read-only earlier in the same session to confirm the
empty day and the missing pause lane.

| Desktop step | Actual result |
| --- | --- |
| First run, nothing tracked | The `■ Stop` control is present and unavailable, because there is nothing to stop. |
| Start a topic, then `■ Stop` | One `focus.started`, then one `focus.paused`. The card reads `■ Stopped · since 16:21` and keeps counting. |
| Quick switcher while tracking | `1 Design review`, then `s ■ Stop` and `u Undo last entry (Design review)`. |
| Quick switcher while stopped | The Stop row is replaced by the state row, `■ Stopped 43:16`, as it was before this phase. |
| Resume, work, stop again | `focus.started`, then `focus.paused`. Five records in total. |
| Analytics for that day | One lane, `Recorded on topics 0:03`, `Switches 2`, `Longest stretch 0:02 · Design review`. The stop is a gap. |
| Analytics for today, on the owner's log | "No topic is recorded on this day", where it previously drew a 16-hour pause lane and marked it as possibly forgotten. |
| Analytics for 10 September, on the owner's log | Three topic lanes, `Recorded on topics 21:01`, `Switches 4`. The 2:59 pause lane is gone. |

Not verified by this phase: the quick-switcher keystroke, for the reason in check 8; the tray
menu, which needs a StatusNotifier host that the private display does not provide, so its `■ Stop`
item is verified in the source only; and behaviour on a physical display, on Wayland, or on any
other platform.

### What this supersedes

- [Phase 4](phase-4-timeline-analytics.md#accepted-decisions) drew a pause lane and summed paused
  time. Both are removed here; its other decisions stand.
- [Phase 3](phase-3-quick-access.md#acceptance-and-verification) recorded the quick switcher and
  the tray offering `❙❙ Pause` on `p`. The surfaces now offer `■ Stop` on `s`. That phase's
  evidence is left as the record of what was verified then.
- [Phase 6](phase-6-application-theme.md#accepted-direction-readout) named `❙❙` as the non-colour
  cue for the not-working state. The cue is now `■`; the rule that state never rests on colour
  alone is unchanged, and no token changed.

## Rollout and rollback

Local delivery; nothing is published. Rollback is reverting the code: no event kind, payload, or
stored file changes in this phase, so a log written before it reads identically after it, and a
log written after it reads identically before it. The change is wording, one glyph, one keystroke,
and which intervals the analytics measure.
