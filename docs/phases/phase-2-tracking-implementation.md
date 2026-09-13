# Phase 2 — Topic tracking implementation

[Roadmap](../ROADMAP.md#delivery-phases) · prev: [Phase 1](phase-1-tracking-design.md) · next: [Phase 3](phase-3-quick-access.md)

**Depends on:** [Phase 0](phase-0-repo-setup.md), [Phase 1](phase-1-tracking-design.md)  
**Effort:** M  
**Complexity:** M  
**Readiness:** Implementation-ready

## Investigation gate

Resolved. The user decided the three implementation-shape questions on 7 September 2026. The
product questions were answered by [Phase 1](phase-1-tracking-design.md#decisions-and-evidence)
and are not reopened here.

| # | Question | Decision |
| --- | --- | --- |
| 1 | Which event kinds the Rust store and the TypeScript core each know about | None in Rust. The store stays kind-agnostic; the vocabulary lives in `src/core/`. See [Accepted decisions](#accepted-decisions). |
| 2 | How the folded state is held in the interface, and whether the log is re-read after each append | The merged log is held in memory, the record returned by `append_event` is added to it, and the pure fold runs again. The log is re-read at startup and after a failure. See [State in the interface](#state-in-the-interface). |
| 3 | What happens when an append fails while a switch is being recorded | Nothing is shown as recorded until the store confirms it. The failure is reported on the control and the log is re-read to reconcile. See [Failure handling](#failure-handling). |

The product decisions were made in Phase 1; this phase implements their outcome.

## Outcome and scope

The tracking loop as designed in Phase 1: topics, an active topic with elapsed time, switching,
pauses, undo, and timestamp correction, persisted as events in the Phase 0 log and read back
through the TypeScript core.

Concretely, this phase delivers the fold specified in
[Folding a log into state](phase-1-tracking-design.md#folding-a-log-into-state) as a pure
function in `src/core/`, with the event vocabulary it interprets, and the window described in
[Screen design](phase-1-tracking-design.md#screen-design) built on top of it: first run, the
active card, the paused card, the topic pick list, the undo row, the entry list with adjust and
restore, the missed-switch path, and topic maintenance.

Out of scope: the global shortcut and tray ([Phase 3](phase-3-quick-access.md)), the timeline
and analytics ([Phase 4](phase-4-timeline-analytics.md)), scoring, synchronization, and
distribution. The fold produces an interval timeline because the current state cannot be derived
without one; presenting that timeline is Phase 4's work, not this phase's.

## Decisions and evidence

The design decisions this phase implements belong to
[Phase 1](phase-1-tracking-design.md#decisions-and-evidence); the storage and logic-split
constraints belong to [Phase 0](phase-0-repo-setup.md#decisions-and-evidence). Recorded below
are only the implementation choices this phase had to make.

### Accepted decisions

| Area | Decision | Gate question |
| --- | --- | --- |
| Rust vocabulary | The store keeps `append_event(kind, payload)` with an opaque string and opaque JSON. It validates no kind and no payload shape, and needs no change for this phase. | 1 |
| Core vocabulary | `src/core/` owns the eight kinds, their payload types, their construction, and their validation on read. | 1 |
| Unknown kinds | An event whose kind is unknown, or whose payload does not match its kind, is ignored by the fold rather than treated as an error. | 1 |
| State in the interface | One merged log in memory, folded on every render path. `read_events` runs at startup; an append adds the returned record to the in-memory log. | 2 |
| Fold input | The fold takes device logs and merges them itself, so it is a total function of the log alone. | 2 |
| Failure handling | No optimistic state. A failed append leaves the displayed state unchanged, reports the failure, and re-reads the log. | 3 |
| Undo target | The undo row targets the event that opened the current interval. | 2 |
| Pick-list order | Topics are listed in creation order, so their numbers stay stable. | 2 |

> Planned replacement: [Phase 16](phase-16-topic-quick-keys.md#decisions-and-evidence)
> replaces position-based numbering with optional saved topic keys and adds access to
> unassigned topics on both surfaces. It replaces this phase's earlier numbering behavior
> without waiting for Phase 5.
> The behavior and verification below describe this earlier phase.

### Rationale

**A kind-agnostic store.** Phase 0 decided that Rust owns durability and TypeScript owns
interpretation. Teaching the store the eight kinds would put the vocabulary in two languages,
make every later kind a Rust change, and — because the store would then reject what it does not
recognize — make a log written by a newer device partly unreadable by an older one. The write
path gains no guarantee worth that: the frontend is the only writer, and the core validates on
read anyway. The cost accepted is that a bug could append a malformed payload and only the read
side would notice.

**Ignoring unknown kinds rather than failing.** The existing log already contains Phase 0
`foundation.check` records, and a future phase will add kinds this fold does not know. Both must
leave the tracking state readable. This is the read-side counterpart of the decision above.

**In-memory advance over re-reading the log.** `append_event` already returns the stored record,
so the merged log after an append is exactly the log before it plus that record — `mergeEvents`
deduplicates by id, so adding it is safe even if a re-read later returns the same event. A switch
then costs one IPC call and no file read, which matters on the hot path the whole design is
judged on. The fold stays the single source of truth: the interface never edits state directly,
it appends an event and folds again.

The case this gives up is another process appending to the same store while the window is open.
That is possible today — Phase 0's store coordinates processes with an OS file lock — but nothing
in this phase creates a second writer, and the tray in [Phase 3](phase-3-quick-access.md) runs in
this same process. A refresh policy would be a rule to choose and tune with no case to test it
against, so it is deliberately not written. The log is re-read at startup and after any append
failure, which covers the case that actually occurs.

**No optimistic state.** The whole model is that the log is the truth and the state is a fold of
it. Showing a switch that the store has not confirmed inverts that: the screen would assert an
interval the log does not contain, and repairing it would need a queue and conflict rules this
phase has no design for. A failed append also may have landed before the response failed, so the
recovery is to re-read rather than to retry blindly.

**Undo targets the opener of the current interval.** Phase 1 says the row shows "the last
effective entry" and that activating it appends `entry.revoked`. Two readings exist when an entry
was back-dated: the last entry in merge order, or the last in timeline order. Timeline order is
chosen, and specifically the event that opens the current interval, because that is the switch
the user just made and expects to take back. The consequence is that a coalesced duplicate is not
reachable from the undo row; it is reachable from the entry list, and revoking it changes nothing
visible either way.

**Creation order for the pick list.** Phase 1 assigns a number key to each row and
[Phase 3](phase-3-quick-access.md) puts the same numbers on the quick surface. Ordering by recent
use would move a topic's number whenever it is used, which defeats the keystroke it exists for.
Creation order is stable and needs no state. The numbers still shift when the active topic, or the
topic offered for resume, drops out of the list, which is what Phase 1's screen design draws.
Whether this is the right order once a user has many topics is a question for
[Phase 5](phase-5-validation-trial.md).

> **Since [Phase 15](phase-15-stable-topic-numbering.md).** The numbers no longer shift: the
> window lists every topic that is not archived, marking the running one, exactly as the quick
> switcher does. Whether creation order is right once a user has many topics remains open.

### State in the interface

One hook owns the merged log and derives everything else:

- At startup, `read_events` returns every record from every device file; `mergeEvents` orders
  them.
- The fold turns that log into the topic registry, the interval timeline, the entry list, and
  the current state. It is pure and is re-run whenever the log changes.
- A user action appends one or two events, adds the returned records to the in-memory log, and
  folds again. Nothing else mutates state.
- The elapsed time is the only value that changes without an event. It is computed from the
  current interval's `effectiveAt` against a clock ticking once a second, and is not stored.

### Failure handling

An action that appends two events — creating a topic and immediately tracking it — appends them
in order. If the second fails, the first stands: a topic exists and is not tracked, which is a
consistent log and a state the interface can display. The failure message says what was recorded
and what was not, and the log is re-read so the screen matches the store.

### Interpretations of the design

Phase 1's screen design leaves layout, wording, and styling to this phase. Three points needed a
choice that is worth recording because it is observable:

| Point | Choice | Reason |
| --- | --- | --- |
| Placeholder for an unknown topic | The core leaves an uncreated topic out of the registry; the window renders `Unknown topic` with the short id | Keeps the placeholder text out of the pure core, where it would be a presentation decision |
| The time field on `adjust` and `Add a missed switch` | A text field taking `YYYY-MM-DD HH:MM` in local time, prefilled | A native `datetime-local` control renders inconsistently in WebKitGTK; a date is needed as well as a time, because an entry may be from yesterday |
| Phase 0's round-trip button | Replaced by the tracking window | Its purpose was to prove the storage round-trip before this phase existed; acceptance check 1 below now exercises the same path |

### Rejected alternatives

- **Typed event kinds in the Rust store.** Rejected under gate question 1; see the rationale
  above.
- **Re-reading the whole log after every append.** Correct and simplest, but pays a directory
  read and a full parse on the most frequent action, growing with the log, to cover a case this
  phase does not create.
- **Optimistic switching with a pending marker.** Rejected under gate question 3.
- **Holding the folded state and mutating it in place.** It would need every action to be
  implemented twice, once as an event and once as a state transition, and the two would drift.
  The fold is cheap enough that re-running it is not worth avoiding.
- **A separate `src/core/` module per event kind.** More files than behaviour; the vocabulary is
  eight kinds and one fold.

## Work packages

- [x] **Extend the domain core with the event vocabulary** (`src/core/tracking.ts`). Define the
  eight kinds of
  [Event vocabulary](phase-1-tracking-design.md#event-vocabulary) with their payload types, a
  reader that narrows an `EventRecord` to a known event or reports it as unknown, and builders
  the interface uses to construct an append. Complete when every kind has a builder and a
  validated reader, unknown kinds and malformed payloads read as unknown, and the module imports
  neither React nor Tauri.

- [x] **Implement the fold** (`src/core/fold.ts`). The four steps of
  [Folding a log into state](phase-1-tracking-design.md#folding-a-log-into-state), from device
  logs to the topic registry, the interval timeline, the entry list, and the current state, with
  merge order and timeline order kept distinct. Effectiveness is resolved on the reference graph,
  absent targets are retained, and tracking events naming an unknown topic still produce
  intervals. Complete when the function is pure, total on any log, and exported with the types
  the interface needs.

- [x] **Test the fold against the specification** (`src/core/fold.test.ts`). The
  [worked example](phase-1-tracking-design.md#worked-example) verbatim, both stages, plus
  coalescing, a revoked revocation, two devices retiming one event in both merge directions, a
  revocation whose target arrives later, an unknown topic, a zero-duration interval, and a
  shuffled input. Complete when acceptance checks 3 to 9 below are covered by tests that fail if
  the rule is removed.

- [x] **Build the tracking window** (`src/App.tsx` and its components). First run, the active
  card with a prominent elapsed time, the paused card with resume, the numbered topic pick list,
  new topic, pause, and the undo row. Every action appends through the store and folds again.
  Complete when each state in
  [Screen design](phase-1-tracking-design.md#screen-design) is reachable and switching costs one
  pointer action or one key.

- [x] **Build correction and maintenance.** `adjust` on the active card with −15m, −30m, −1h and
  a time field; the entry list with adjust, undo, and restore per entry; `Add a missed switch`;
  and a topics view for rename, archive, and restore. Complete when every event kind in the
  vocabulary has a reachable action that emits it, and no action edits or removes a log line.

- [x] **Wire the store access and failure path** (`src/store.ts`, `src/useTracking.ts`). The only
  Tauri imports in the frontend, the in-memory log, the append-and-fold path, and the reconciling
  failure path decided above. Complete when a forced append failure leaves the state unchanged,
  reports it, and re-reads the log.

- [x] **Run the checks and record the results.** Phase 0's automated checks, the desktop
  walkthrough, and the log-integrity checks in
  [Acceptance and verification](#acceptance-and-verification). Complete when each row has an
  actual result recorded.

## Acceptance and verification

Phase 1 wrote the observable acceptance checks for this phase; see
[Acceptance checks for the implementation phase](phase-1-tracking-design.md#acceptance-checks-for-the-implementation-phase).
They are reproduced here with their results.

| # | Criterion | How it is checked | Actual result |
| --- | --- | --- | --- |
| 1 | Selecting a topic while another is active appends exactly one `focus.started` and nothing else | Inspect `events/<device>.jsonl` before and after | Passed. A click on a topic row and a press of its number key each added exactly one `focus.started`; the preceding lines stayed byte-identical by SHA-256. |
| 2 | Creating a topic and tracking it appends `topic.created` then `focus.started` | Same | Passed. Three topics were created; each added exactly two lines in that order. |
| 3 | The worked example folds to the stated timeline and current state, and appending `e10` produces the stated second timeline | Table-driven Vitest test in `src/core/` using the example verbatim | Passed. `src/core/fold.test.ts` holds the ten events verbatim and asserts both stated timelines and the current state. |
| 4 | Re-selecting the active topic starts no new interval | Core unit test on the coalescing rule | Passed. |
| 5 | Revoking a revocation restores the target | Core unit test | Passed, and observed on the desktop: `restore` on a revoked pause brought it back. |
| 6 | Two devices retiming the same event resolve to the last in merge order, on both devices | Core unit test folding the same events in both device orders and comparing | Passed. |
| 7 | A revocation whose target is absent is retained and applies once the target is merged | Core unit test with the target withheld, then added | Passed. |
| 8 | A `focus.started` naming an unknown topic still produces an interval with a placeholder name | Core unit test | Passed in the core; the window renders such a topic as `Unknown topic <short id>`. |
| 9 | The fold is a pure function of the merged log: same input, same output, no dependence on device or wall clock | Core unit test folding shuffled inputs | Passed, both shuffled in one log and split across two. |
| 10 | Adjusting an entry appends `entry.retimed` and rewrites nothing | Hash the existing lines of the log file before and after; only appended lines differ | Passed. Two adjustments (−1h, −15m); each added one line and left the SHA-256 of the preceding lines unchanged. |
| 11 | No path removes or edits a log line | Line count is monotonic across a full session exercising every action | Passed. 0 → 2 → 5 → 7 → 8 → 9 → 10 → 11 → 12 → 13 → 14 → 16 → 18 → 19 → 20 lines, never decreasing, across a session that emitted all eight kinds. |
| 12 | The active card's elapsed time equals now minus the current interval's `effectiveAt` | Manual desktop check against a back-dated entry | Passed. After two back-datings the current interval opened at 16:23:35 and the card read 0:01:41 at 16:25:16. |
| 13 | The folded state after a restart equals the state before it | Manual desktop check, as in Phase 0's round-trip | Passed. Closing and restarting reproduced the same screen: zero differing pixels with the ticking clock masked, and the entry list differed only by a 5-pixel scrollbar strip. |
| 14 | Logging a switch costs one pointer action in the focused window | Manual desktop check | Passed. One click on a topic row, or one number key, appends the switch. |
| 15 | Every state in the screen design is reachable: first run, active, paused, undo, entry list, missed switch | Manual desktop walkthrough | Passed, plus resume-from-pause and the topics view. Every one of the eight kinds was emitted by a reachable action. |
| 16 | Phase 0's checks still pass and `src/core/` imports neither React nor Tauri | `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `cargo fmt --check`, `cargo clippy -- -D warnings`, `cargo test`, and an import check | Passed. 24 Vitest tests and 5 Rust storage tests; Biome reported no diagnostics; no file under `src/core/` names React or Tauri. |

### Implementation details

- `src/core/tracking.ts` holds the vocabulary: payload types per kind, a builder per kind, and a
  reader that narrows a stored record or returns null. `src/core/fold.ts` holds the four-step
  fold. `src/core/events.ts` gained an exported timestamp comparator so merge order and timeline
  order use one rule; `mergeEvents` is otherwise unchanged.
- The interface is `src/store.ts` (the only Tauri import), `src/useTracking.ts` (the log, the
  fold, the append path, the elapsed clock), `src/actions.ts` (each user action as the events it
  appends), and the three views. A recorded action clears a message left by a failed one.
- No Rust file changed. Phase 0's round-trip button is gone; the window is the tracking screen.
- Topic ids are UUIDs generated in the frontend with `crypto.randomUUID`.

### Verification evidence — 7 September 2026

Automated checks ran at the repository root and in `src-tauri/`. The desktop walkthrough ran the
development build under an isolated Xvfb display on Linux/X11 with a temporary `XDG_DATA_HOME`,
driven by `xdotool`, with a screenshot after every step.

| Desktop step | Actual result |
| --- | --- |
| First run | The empty state asked one question with a focused name field; no setup screen. |
| Name a topic and start | Two lines: `topic.created` then `focus.started`. The active card showed the elapsed time as its largest element. |
| Switch by click, and by number key | One `focus.started` each, and nothing else. |
| `adjust` −1h, then −15m | One `entry.retimed` each. Back-dating an entry past an earlier one reordered the timeline and changed which entry was current, which is what the fold specifies. |
| Pause, then undo | `focus.paused`, then `entry.revoked`; the pause disappeared and the previous topic became current again with its elapsed time continuous. |
| Entry list, `restore` | The revoked pause was listed struck through and came back after `restore`, which appended a revocation of the revocation. |
| Add a missed switch at 12:00 | One back-dated `focus.paused`, inserted in the past in the right position. |
| Rename, archive, restore a topic | `topic.renamed`, `topic.archived`, `topic.restored`. The archived topic left the pick list and kept its history. |
| Restart | Same state, same pick list, same last entry; see check 13. |
| Forced append failure (log file made read-only) | The screen did not change, no line was written, and the message named the failure and said the log had been re-read. The next switch succeeded and cleared the message. |

Not verified by this phase: the packaged standalone executable and its offline behaviour, which
Phase 0 checked and this phase does not change; behaviour on a physical display, on Wayland, or
on any other platform; and whether the interaction survives real working days, which is
[Phase 5](phase-5-validation-trial.md)'s subject. The screenshots and the temporary event log
were written under the session scratch directory and are not repository data.

## Rollout and rollback

Local delivery on the development machine; nothing is published. Rollback is reverting the
tracking code; the Phase 0 foundation and its store stand without it.

Data written by this phase is real tracking data. Because the log is append-only, a rollback
leaves it readable, and any later change to the fold must keep earlier events meaningful. The
store is unchanged by this phase, so a log written before it is read unchanged after it: Phase 0
`foundation.check` records are ignored by the fold rather than removed. A rollback would leave
tracking events in the log with nothing to interpret them, which is recoverable, not lost.
