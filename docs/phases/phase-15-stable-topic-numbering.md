# Phase 15 — Stable topic numbering

[Roadmap](../ROADMAP.md#delivery-phases) · prev: [Phase 14](phase-14-further-statistics.md) · next: [Phase 16](phase-16-topic-quick-keys.md)

**Depends on:** [Phase 2](phase-2-tracking-implementation.md), [Phase 3](phase-3-quick-access.md)  
**Effort:** L  
**Complexity:** L  
**Readiness:** Implementation-ready

## Investigation gate

Resolved. The user decided this on 12 September 2026, from the running window. It records a
behaviour that [Phase 2](phase-2-tracking-implementation.md#rationale) had already named as a
wart and left to a later phase.

| # | Question | Decision |
| --- | --- | --- |
| 1 | Should the topic offered for resume stay in the switch list while tracking is stopped? | Yes. Stopping must not renumber the rows, and the last topic is reachable by its own key as well as by Resume. |
| 2 | Should the running topic stay in the list? | Yes. The quick switcher already lists every topic and records why: the number is muscle memory and must not move because a topic happens to be running. The window now follows the same rule. |

## Outcome and scope

One numbering, in both surfaces. The window's switch list holds every topic that is not archived,
in creation order, so a number belongs to a topic and never moves. The running topic is marked in
the list instead of being removed from it.

Out of scope: what happens beyond nine topics, which was deferred as [Q16](../OPEN_QUESTIONS.md) and is now planned in
[Phase 16](phase-16-topic-quick-keys.md); ordering by recent use, rejected in
[Phase 2](phase-2-tracking-implementation.md#rationale); and any change to the card, the Resume
control, or the events that a selection appends.

## Decisions and evidence

### Accepted decisions

| Area | Decision | Gate question |
| --- | --- | --- |
| List contents | Every topic that is not archived, in creation order, in the window as in the quick switcher. | 1, 2 |
| The running row | Stays in the list, carries the `▶` mark and the word "running" for a screen reader, and keeps its number. | 2 |
| Selecting it | Appends `focus.started` as any row does. The fold coalesces an entry that repeats the running subject, so no interval opens and nothing is lost. | 2 |
| The Resume control | Unchanged. The last topic is offered there and is also in the list, which is what "as well" means. | 1 |

### Rationale

**A number must belong to a topic.** The whole point of the numbered rows is that the key is
faster than reading. A number that moves when a topic starts running, or when tracking stops, is
worse than no number: the user learns `2` and presses it for something else.
[Phase 3](phase-3-quick-access.md) reached this conclusion for the quick switcher and wrote it
into the code; the window disagreed with it, so the same topic had one number on one surface and
another number on the other. This removes the disagreement rather than adding a rule.

**Marking beats removing.** The card above already says what is running, in the largest type on
screen. The list needs only to say which row that is, which the `▶` mark does, with the word
carried for anything that does not see the mark. Nothing is hidden to avoid a redundant row.

**A redundant selection is harmless.** Selecting the running topic appends an entry that the fold
coalesces, so the timeline does not change. That was already true of the quick switcher's
equivalent row, and the log gaining a line that changes nothing is the cost of a stable number.

### Rejected alternatives

- **Disabling the running row.** It would keep the number stable but make the row a dead target,
  and a disabled control has to explain itself.
- **Keeping the window as it was and renumbering the quick switcher to match.** That would move
  the numbers the quick switcher exists to keep still.
- **Showing the elapsed reading on the running row**, as the quick switcher does. In the window
  the card already carries it, in a size the row cannot compete with.

## Work packages

- [x] **List every topic in the window** (`src/TrackView.tsx`). Drop the filters that removed the
  active topic and the resume topic; mark the running row with `▶` and hidden text; set
  `aria-current` on it. Complete when the window and the quick switcher number the same topics the
  same way.

- [x] **Give the row room** (`src/App.css`). The name takes the space and the mark sits at the end,
  so rows stay aligned whether or not one is marked. Complete when the mark reads in the state
  colour and adds no new token.

- [x] **Run the checks and record the results.** Root and `src-tauri/` checks, and the running
  window. Complete when each row below has an actual result.

## Acceptance and verification

| # | Criterion | How it is checked | Actual result |
| --- | --- | --- | --- |
| 1 | The window lists every topic that is not archived, in creation order | Read the running window against a log with three topics | Passed. `1 Awesome Project`, `2 OncoJournal MR reviews`, `3 Konzentri development`, the second one running. |
| 2 | The running topic is in the list, marked, and keeps its number | Same | Passed. The running row carries `▶` and stays at its own number. |
| 3 | The window and the quick switcher give a topic the same number | Compare both surfaces against the same log | Passed. Both number every topic that is not archived in creation order. |
| 4 | Stopping does not renumber the rows | Stop, then read the list | Passed by construction and by reading: the list no longer depends on the running or resumed topic. The same `choices` array is used in both states, and the mark is simply absent while stopped. |
| 5 | The mark is not the only carrier of "running" | Read the markup | Passed. `▶`, the hidden word "running", and `aria-current` on the row. |
| 6 | Selecting the running topic changes no interval | Core rule, already tested | Passed. `src/core/fold.test.ts` covers coalescing; the entry appends and the timeline is unchanged. |
| 7 | The existing checks still pass | `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `cargo fmt --check`, `cargo clippy -- -D warnings`, `cargo test` | Passed. 53 Vitest tests in 5 files, 5 Rust tests, no diagnostics. |

### Verification evidence — 12 September 2026

Checks 1, 2, and 5 were read from the running window on the development machine, against the
owner's own log, which then held three topics with the second one running. No event was appended
by this verification: the window was opened, read, and closed.

Not verified on a private display: the owner's own development session held the fixed Vite port
while this change was made, and two sessions cannot share it. The screenshot evidence therefore
comes from the session already running, and the stopped case is recorded as check 4 explains —
from the code and the markup, not from a second screenshot.

### What this supersedes

- [Phase 1](phase-1-tracking-design.md#screen-design) drew the pick list without the running topic
  and without the topic offered for resume.
- [Phase 2](phase-2-tracking-implementation.md#rationale) recorded the consequence — "The numbers
  still shift when the active topic, or the topic offered for resume, drops out of the list" — and
  left it open. It no longer happens.

## Rollout and rollback

Local delivery; nothing is published. Rollback is restoring the two filters. No event kind,
payload, or stored file changes, and no recorded log is read differently before or after.
