# Phase 1 — Tracking experience design

[Roadmap](../ROADMAP.md#delivery-phases) · prev: [Phase 0](phase-0-repo-setup.md) · next: [Phase 2](phase-2-tracking-implementation.md)

**Depends on:** [Phase 0](phase-0-repo-setup.md)  
**Effort:** M  
**Complexity:** M  
**Readiness:** Implementation-ready

## Investigation gate

Resolved. The user decided the questions below on 6 September 2026; the detail and rationale
are in [Decisions and evidence](#decisions-and-evidence). This phase produced a design, not an
application, and no application code was written.

| # | Question | Decision |
| --- | --- | --- |
| 1 | Switch interaction | One action. Selecting a topic ends the running interval and starts the next at the same instant. Nothing is active only before the first entry or after an explicit pause. See [Tracking model](#tracking-model). |
| 2 | Topic lifecycle | Topics are entities with a stable id, created while logging, renameable and archivable. Events carry the id only. See [Tracking model](#tracking-model). |
| 3 | Pause semantics | A distinct state with its own event kind. It never ends automatically; switching to a topic ends it in one action. See [Tracking model](#tracking-model). |
| 4 | Event vocabulary | Eight kinds across topics, tracking, and corrections. See [Event vocabulary](#event-vocabulary). |
| 5 | Event time versus record time | Tracking events carry a required `effectiveAt` in the payload. Topic and correction events have no interval and use `recordedAt` alone. See [Event vocabulary](#event-vocabulary). |
| 6 | Undo and correction | `entry.revoked` and `entry.retimed` reference an earlier event id. Any event can be revoked, including a revocation, which gives redo. Only tracking events can be retimed. See [Folding a log into state](#folding-a-log-into-state). |
| 7 | Interruption versus completion | Not recorded in this phase. See [Rejected alternatives](#rejected-alternatives). |
| 8 | Surface boundary | The quick-access surface offers switching, pause, and undo of the last entry. Everything else is window-only. See [Surface boundary](#surface-boundary). |
| 9 | Missed entries | A prominent elapsed time, back-dating in the same interaction, and a window path to add a missed switch. Nothing automatic. See [Missed entries](#missed-entries). |

Recording these outcomes resolves [Q05](../OPEN_QUESTIONS.md). Scoring
([Q07](../OPEN_QUESTIONS.md)) and analytics ([Q08](../OPEN_QUESTIONS.md)) were out of scope and
remain open; no decision here depends on them.

## Outcome and scope

A written specification of the tracking interaction that is concrete enough to implement
without further product decisions: the tracking model, the event vocabulary and payloads, the
undo and correction rules, a low-fidelity screen design with its states, and the acceptance
checks the implementation phase will be measured against.

The goal is fast, near-effortless recording of a context switch. The design is judged on the
cost of logging, not on how much it can express.

In scope: topics, active topic, switching, pauses, undo, timestamp correction, the event
vocabulary those actions produce, and which actions belong on the quick-access surface.

Out of scope: writing tracking code, the score or effort levels, analytics and the timeline,
the global shortcut and tray implementation, synchronization, accounts, payments, licensing,
and distribution. Designing the interaction does not authorize implementing it; that is
[Phase 2](phase-2-tracking-implementation.md).

## Decisions and evidence

Decided by the user on 6 September 2026.

### Accepted decisions

| Area | Decision | Gate question |
| --- | --- | --- |
| Switching | One action. Selecting a topic closes the running interval and opens the next at the same instant; there is no gap and no second step. | 1 |
| Idle state | There is no separate stop action. Pause is the only way to have nothing active, and ending the working day is a pause. | 1 |
| Topic identity | A topic is an entity with a stable UUID. Tracking events carry `topicId` only, never the name. | 2 |
| Topic creation | Topics are created by naming them at the moment of tracking, in the window. There is no separate setup step before the first entry. | 2 |
| Topic maintenance | Topics can be renamed and archived. Archiving removes a topic from the pick lists and keeps its history intact. | 2 |
| Pause | A first-class state with its own event kind and its own interval kind, distinct from any topic. | 3 |
| Pause duration | A pause never ends automatically. It ends when the user selects a topic, in one action. | 3 |
| Event vocabulary | Eight kinds: four for topics, two for tracking, two for corrections. Every action maps to exactly one kind, and no kind exists without an action. | 4 |
| Effective time | `focus.started` and `focus.paused` carry a required `effectiveAt`. Normally it equals `recordedAt`; a back-dated or corrected entry is not a special case in the fold. | 5 |
| Correction mechanism | Corrections are new events referencing an earlier event id. Nothing in the log is ever edited or removed. | 6 |
| Undo reach | Any event can be revoked, including another revocation, which is how redo works. Only tracking events can be retimed. | 6 |
| Completion versus interruption | Not captured. Revisit after [Phase 5](phase-5-validation-trial.md). | 7 |
| Quick-access surface | Switch to an existing topic, pause, undo the last entry. Nothing else. | 8 |
| Missed entries | A prominent elapsed time, back-dating offered in the switch interaction, and a window path to insert a missed switch. No idle detection and no automatic data. | 9 |

### Tracking model

The folded state has exactly three forms:

- **Idle** — no effective tracking event exists. This is first run, and nothing else.
- **Active** — a topic has been running since a known instant.
- **Paused** — a pause has been running since a known instant.

After the first entry, every instant is attributed either to a topic or to a pause. There is no
fourth "untracked" state. The consequence is deliberate and must be stated plainly: a stretch
where the user forgot to log is attributed to whatever was last active, and inflates that topic
until it is corrected. It does not appear as a hole. How often that happens is one of the
things [Phase 5](phase-5-validation-trial.md) has to measure, and back-dating exists to repair
it; see [Missed entries](#missed-entries).

A pause spans whatever it spans, including overnight. Presenting long or overnight pauses is an
analytics concern and belongs to [Phase 4](phase-4-timeline-analytics.md), not to this model.

> **Naming, since [Phase 13](phase-13-stop-replaces-pause.md).** What this document calls a pause
> is called Stop on every surface a user reads, because the decision above — that there is no
> separate stop action — made the word Pause misleading. The model, the state, and the stored kind
> `focus.paused` are unchanged, and stopped time is not measured by the analytics.

The user actions are: select a topic, pause, create a topic, rename a topic, archive or restore
a topic, undo an entry, and adjust an entry's time. Each maps to exactly one event kind.

### Event vocabulary

Each record uses the Phase 0 shape `{id, device, recordedAt, kind, payload}`. `id`, `device`,
and `recordedAt` are assigned by the Rust store. `topicId` is a UUID generated by the frontend
when the topic is created; it must be unique across devices.

`effectiveAt` and `recordedAt` both use RFC 3339 in UTC, matching Phase 0.

| Kind | Payload | Emitted when | Revocable | Retimable |
| --- | --- | --- | --- | --- |
| `topic.created` | `{topicId: string, name: string}` | A topic is named for the first time | Yes | No |
| `topic.renamed` | `{topicId: string, name: string}` | A topic is renamed | Yes | No |
| `topic.archived` | `{topicId: string}` | A topic is archived | Yes | No |
| `topic.restored` | `{topicId: string}` | An archived topic is restored | Yes | No |
| `focus.started` | `{topicId: string, effectiveAt: string}` | A topic is selected | Yes | Yes |
| `focus.paused` | `{effectiveAt: string}` | Pause is activated | Yes | Yes |
| `entry.revoked` | `{targetId: string}` | An entry is undone, or an undo is reversed | Yes | No |
| `entry.retimed` | `{targetId: string, effectiveAt: string}` | An entry's time is adjusted | Yes | No |

Notes that constrain the implementation:

- Creating a topic and immediately tracking it emits two events, `topic.created` then
  `focus.started`. That is one user action producing two records, not two user actions.
- Adding a missed switch emits a single back-dated `focus.started` or `focus.paused`. There is
  no separate kind for a late entry.
- Correcting a correction is another `entry.retimed` on the same original target, never a
  retime of a retime.
- Only `focus.*` events carry `effectiveAt`. Topic and correction events describe the log, not
  the timeline, and the fold must not read a time from their payloads.

### Folding a log into state

The fold is a pure function in `src/core/` from a set of device logs to the current state and
the interval timeline. It runs in four steps, in this order.

**1. Merge.** Union the device logs with the existing `mergeEvents`, which deduplicates by
event id and orders by `recordedAt`, then sub-millisecond precision, then id. Call this the
**merge order**. It is deterministic and identical on every device.

**2. Effectiveness.**

> An event `e` is *effective* unless some event `r` with `kind = "entry.revoked"` and
> `r.payload.targetId = e.id` is itself effective.

This is defined on the reference graph, not on merge order. That matters: an event id cannot be
referenced before it exists, so the graph is acyclic and the recursion terminates, but two
devices with skewed clocks can produce a revocation whose `recordedAt` precedes its target's.
A rule based on log position would be wrong there; this one is not.

Consequences, all deterministic:

- Two devices revoking the same event both take effect, and the target is revoked once.
  Revocation is idempotent.
- Revoking a revocation makes the original effective again. That is redo.
- Longer chains alternate by parity and need no special case.
- A revocation whose target is not present, because that device's log has not been merged yet,
  is retained and applies as soon as the target arrives. It is not an error and is not dropped.

**3. Topic registry.** From the effective topic events, in merge order: a topic exists once
`topic.created` is effective; its name is the last effective `topic.renamed`, or the created
name; it is archived or not according to the last effective `topic.archived` or
`topic.restored`.

**4. Timeline.** For each effective tracking event:

> `effectiveAt(e)` is the `effectiveAt` of the last effective `entry.retimed` targeting `e` in
> merge order, or `e.payload.effectiveAt` if there is none.

Two devices retiming the same event is therefore resolved by merge order, which both devices
compute identically. Then:

- Sort the effective tracking events by `effectiveAt`, then `recordedAt`, then sub-millisecond
  precision, then id. Call this the **timeline order**. It differs from merge order whenever an
  entry was back-dated or retimed, and the implementation must not conflate the two.
- **Coalesce:** drop any event whose subject equals the previous event's subject — the same
  `topicId`, or two consecutive pauses. It starts no new interval. This makes a double press,
  and the same switch arriving from two surfaces or two devices, harmless.
- Each remaining event opens an interval that ends when the next one opens. The last interval
  is open and is the current state. With no effective tracking events, the state is idle.
- An interval of zero duration, which happens when two different subjects share an
  `effectiveAt`, is omitted from the derived timeline. The events stay in the log and timeline
  order still decides which one is current.

Two further rules keep the fold total under multi-device interleaving:

- A `focus.started` naming a topic that is not in the registry, because the topic event has not
  been merged yet or was revoked, still produces an interval. The topic renders with a
  placeholder name until its creation event arrives. Real tracking data is never discarded to
  keep the registry tidy.
- An `entry.retimed` whose target is absent, or is not a tracking event, is retained and has no
  effect unless the target later qualifies.

### Worked example

Short ids stand in for UUIDs. All times are UTC on one day, and the state is read at 13:10.

| # | id | device | recordedAt | kind | payload |
| --- | --- | --- | --- | --- | --- |
| 1 | `e1` | A | 09:00:00 | `topic.created` | `{topicId: "t1", name: "Login"}` |
| 2 | `e2` | A | 09:00:00.5 | `focus.started` | `{topicId: "t1", effectiveAt: "09:00:00"}` |
| 3 | `e3` | A | 10:30:00 | `topic.created` | `{topicId: "t2", name: "Email"}` |
| 4 | `e4` | A | 10:30:01 | `focus.started` | `{topicId: "t2", effectiveAt: "10:30:01"}` |
| 5 | `e5` | A | 10:30:04 | `entry.revoked` | `{targetId: "e4"}` |
| 6 | `e6` | A | 12:00:00 | `focus.paused` | `{effectiveAt: "11:45:00"}` |
| 7 | `e7` | B | 13:00:00 | `topic.renamed` | `{topicId: "t1", name: "Login flow"}` |
| 8 | `e8` | A | 13:05:00 | `focus.started` | `{topicId: "t1", effectiveAt: "13:00:00"}` |
| 9 | `e9` | A | 13:06:00 | `entry.retimed` | `{targetId: "e6", effectiveAt: "11:30:00"}` |

What the steps do:

- `e5` revokes `e4`, so the accidental switch to Email at 10:30:01 never happened.
- `e6` is a pause recorded at 12:00 for a break that began at 11:45, and `e9` later corrects it
  to 11:30.
- `e7` renames `t1` from the second device; no tracking event changes, because events carry the
  id only.
- `e8` is back-dated by five minutes. Note that `e9` follows `e8` in merge order while the
  interval `e6` opens precedes it in timeline order. This is the case that distinguishes the
  two orders.

Resulting state:

```
Topics    t1 "Login flow" (active)
          t2 "Email" (exists, never tracked)
Timeline  09:00:00 - 11:30:00  topic t1
          11:30:00 - 13:00:00  pause
          13:00:00 - open      topic t1
Current   topic t1 since 13:00:00, elapsed 0:10:00
```

Now append one more event, on device A at 13:10:00:

| # | id | device | recordedAt | kind | payload |
| --- | --- | --- | --- | --- | --- |
| 10 | `e10` | A | 13:10:00 | `entry.revoked` | `{targetId: "e5"}` |

`e5` is no longer effective, so `e4` is effective again and the Email switch returns:

```
Timeline  09:00:00 - 10:30:01  topic t1
          10:30:01 - 11:30:00  topic t2
          11:30:00 - 13:00:00  pause
          13:00:00 - open      topic t1
Current   topic t1 since 13:00:00
```

A separate one-line case for coalescing: a second `focus.started {topicId: "t1"}` arriving at
13:00:02, from the tray or from another device, is dropped by step 4 and leaves the timeline
above unchanged.

### Screen design

Low-fidelity. Layout, wording, and styling are the implementation's business; the states,
the controls, and their placement are not.

**First run, no topics.** No setup step and no empty topic manager. The only thing on screen is
the question the application exists to ask.

```
+------------------------------------------+
|  Konzendi                                |
+------------------------------------------+
|                                          |
|   Nothing tracked yet.                   |
|   What are you working on?               |
|                                          |
|   +----------------------------------+   |
|   | Login flow_                      |   |
|   +----------------------------------+   |
|                                          |
|                    [ Start tracking ]    |
+------------------------------------------+
```

**Active topic.** The elapsed time is the largest element on screen, because noticing an
implausible number is the whole defence against a missed entry. Switching is one click on a
topic row, or its number key.

```
+------------------------------------------+
|  Konzendi                          [...] |
+------------------------------------------+
|                                          |
|   > Login flow                  1:24:07  |
|     started 13:00 - adjust               |
|                                          |
+------------------------------------------+
|   1  Email                               |
|   2  Code review                         |
|   3  Documentation                       |
|                                          |
|   +  New topic                           |
+------------------------------------------+
|   Last entry 13:00 Login flow    Undo    |
+------------------------------------------+
|   ||  Pause                              |
+------------------------------------------+
```

**Paused.** The last topic is offered as a single resume action, which is an ordinary
`focus.started` and needs no new event kind.

> **Since [Phase 15](phase-15-stable-topic-numbering.md).** The wireframes below leave the running
> topic, and the topic offered for resume, out of the numbered list. Both now stay in it, so a
> number never moves; the running row is marked instead of removed.

```
+------------------------------------------+
|   || Paused                     0:12:31  |
|      since 11:30 - adjust                |
+------------------------------------------+
|   1  Email                               |
|   2  Code review                         |
|                                          |
|   +  New topic                           |
+------------------------------------------+
|   Last entry 11:30 Paused        Undo    |
+------------------------------------------+
|   >  Resume Login flow                   |
+------------------------------------------+
```

**Undo.** Undo is a persistent row showing the last effective entry, not a timed toast. A toast
is exactly what a user misses, because the design's own goal is that they went straight back to
work. Activating it appends `entry.revoked` and the row then shows the entry that has become
last. Older entries are reachable through the entry list.

**Late correction and missed switches.** `adjust` on the active card offers −15m, −30m, −1h,
and a time field, and appends `entry.retimed` against the event that opened the current
interval. The entry list does the same for any entry, and can revoke or restore one.

```
+------------------------------------------+
|  < Recent entries                        |
+------------------------------------------+
|  13:00  >  Login flow     adjust   undo  |
|  11:30  || Paused         adjust   undo  |
|  10:30  >  Email          revoked restore|
|  09:00  >  Login flow     adjust   undo  |
|                                          |
|  +  Add a missed switch                  |
+------------------------------------------+
```

`Add a missed switch` asks for a topic or pause and a time, and appends one back-dated
`focus.started` or `focus.paused`. A revoked entry stays visible, struck through, with
`restore`, which appends a revocation of the revocation.

**Quick-access surface.** Constrains [Phase 3](phase-3-quick-access.md), which implements it.
Every row is one keystroke. There is no text entry, because topic creation is window-only.

```
   +-----------------------------+
   | 1  Login flow      * 1:24   |
   | 2  Email                    |
   | 3  Code review              |
   | --------------------------- |
   | p  Pause                    |
   | u  Undo last entry          |
   +-----------------------------+
```

### Interaction cost

Counted from the design above. These are counted steps, not measured times; see
[Evidence and its limits](#evidence-and-its-limits).

| Path | Steps to log a switch | Working window focus |
| --- | --- | --- |
| Global shortcut (chosen design) | 2 keystrokes: open the surface, press the topic's number | Lost while the surface is open, returned on selection |
| Tray | 2 pointer actions: open the menu, click the topic | Lost, returned on selection |
| Window already visible on another display | 1 pointer action | Lost on the click |
| Window focused | 1 pointer action or 1 keystroke | n/a |

Rejected alternatives, counted the same way:

| Rejected alternative | Steps | Why rejected |
| --- | --- | --- |
| Two-action switching: end, then start | 4 keystrokes via the shortcut, or 3 if the surface stays open | Doubles the cost of the most frequent action and adds a second chance to forget, in exchange for expressing a gap that a pause already expresses |
| Completion captured on every switch | 3 keystrokes | Puts a second decision in the hot path, which is precisely what the design is judged on |
| Predefined topics only | 2 keystrokes for an existing topic; roughly 5 actions for a new one, all of them in the window | Forces a detour at the exact moment of switching, which is when logging gets skipped |
| Topic creation on the quick surface | 2 keystrokes plus typing a name | Requires a text field and keyboard focus on the surface. Rejected by the user; see the trade-off below |

The rejected surface option has a real cost: switching to a topic that does not exist yet
requires opening the window, so the entry is late by however long that takes. The mitigation is
that the same switch can be back-dated in one further interaction, and that a genuinely new
topic is a rare event compared with switching between existing ones. This is recorded as an
accepted trade-off, not as a non-issue, and is worth revisiting after
[Phase 5](phase-5-validation-trial.md).

### Surface boundary

Every action in the tracking model is assigned. Resolves gate question 8 and constrains
[Phase 3](phase-3-quick-access.md).

| Action | Window | Quick surface | Reason |
| --- | --- | --- | --- |
| Switch to an existing topic | Yes | Yes | The hot path, and the reason the surface exists |
| Pause | Yes | Yes | Stepping away is as time-critical as switching |
| Resume the last topic | Yes | Yes, as an ordinary topic row | Needs no separate control |
| Undo the last entry | Yes | Yes | An accidental switch made from the surface must be repairable from the surface |
| Create a topic | Yes | No | Needs text entry; the surface stays a keystroke-only pick list. Trade-off recorded above |
| Rename, archive, restore a topic | Yes | No | Rare and not time-critical |
| Adjust an entry's time | Yes | No | Needs a time field and surrounding context |
| Revoke or restore an older entry | Yes | No | Needs the entry list |
| Add a missed switch | Yes | No | Needs topic and time entry |

### Missed entries

The design offers three things and deliberately offers nothing automatic.

1. **The elapsed time is the largest element on the active card.** A four-hour number on a
   topic the user left before lunch is meant to be impossible to miss.
2. **Any entry can be back-dated in the same interaction.** `adjust` on the active card offers
   −15m, −30m, −1h, and a time field. Logging late and then correcting is a two-step path that
   never requires leaving the main screen.
3. **A missed switch can be inserted into the past** from the entry list, as a single
   back-dated event.

Automatic idle detection was rejected for this phase: it needs OS idle APIs, adds a platform
dependency and X11-specific risk on the only supported target, and would put the application in
the position of inventing intervals the user never recorded. A threshold-based hint on long
intervals was also rejected, because it introduces a threshold to choose and tune with no
evidence yet about what a normal interval looks like. Both are candidates to reconsider once
[Phase 5](phase-5-validation-trial.md) has measured how often entries are actually missed.

### Rejected alternatives

- **Two-action switching.** Rejected on interaction cost; see the table above.
- **Topics as plain labels on each event.** Cheapest log, but renaming would require rewriting
  history, which the append-only model forbids, and every typo would become a permanent
  separate topic.
- **Topics predefined in a management screen only.** Rejected because it puts a detour at the
  moment of switching.
- **Pause as an ordinary topic named "Pause".** No new concept, but breaks would pollute
  per-topic statistics and could not be treated separately by later analytics.
- **Pause as the mere absence of an active topic.** Smallest vocabulary, but a deliberate break
  becomes indistinguishable from a stretch that was never logged, which removes the one
  distinction a pause is for.
- **A separate stop action alongside pause.** Rejected as a third state that users would have
  to choose between under time pressure; ending the day is a pause.
- **Capturing completion versus interruption.** Rejected for this phase. On every switch it
  costs a step in the hot path. As an optional annotation it is nearly free, but it adds an
  event kind and produces partial data that most switches would lack, before
  [Phase 5](phase-5-validation-trial.md) has established that plain switches get logged at all.
  This is a decision to defer, not a decision that the distinction is uninteresting; the
  concept discussion's interest in it stands.
- **Single-level undo of the most recent entry only.** Simpler to explain, but an accidental
  switch noticed ten minutes later would be unfixable, and "most recent" needs a rule anyway
  once two devices interleave — the same rule that makes general revocation work.
- **`effectiveAt` present only when it differs from `recordedAt`.** Smaller records, but the
  fold would need two paths and a late entry would be distinguishable from a live one only by a
  missing field.

### Evidence and its limits

The optional clickable prototype was not built. The chosen interaction is two keystrokes and
the alternatives differ by whole steps, so a timing experiment would refine numbers that are
not in dispute. The question that matters — whether the habit holds in real work — cannot be
answered by a prototype and is [Phase 5](phase-5-validation-trial.md)'s subject. No prototype
code exists and none was committed.

The step counts in this document are counted from the design, not measured. The X11 focus
behaviour of the quick-access surface is assumed from Phase 0's environment evidence and is
verified by [Phase 3](phase-3-quick-access.md), not here.

### Acceptance checks for the implementation phase

The observable criteria [Phase 2](phase-2-tracking-implementation.md) is measured against, with
how each is checked.

| # | Criterion | How it is checked |
| --- | --- | --- |
| 1 | Selecting a topic while another is active appends exactly one `focus.started` and nothing else | Inspect `events/<device>.jsonl` before and after |
| 2 | Creating a topic and tracking it appends `topic.created` then `focus.started` | Same |
| 3 | The worked example folds to the stated timeline and current state, and appending `e10` produces the stated second timeline | Table-driven Vitest test in `src/core/` using the example verbatim |
| 4 | Re-selecting the active topic starts no new interval | Core unit test on the coalescing rule |
| 5 | Revoking a revocation restores the target | Core unit test |
| 6 | Two devices retiming the same event resolve to the last in merge order, on both devices | Core unit test folding the same events in both device orders and comparing |
| 7 | A revocation whose target is absent is retained and applies once the target is merged | Core unit test with the target withheld, then added |
| 8 | A `focus.started` naming an unknown topic still produces an interval with a placeholder name | Core unit test |
| 9 | The fold is a pure function of the merged log: same input, same output, no dependence on device or wall clock | Core unit test folding shuffled inputs |
| 10 | Adjusting an entry appends `entry.retimed` and rewrites nothing | Hash the existing lines of the log file before and after; only appended lines differ |
| 11 | No path removes or edits a log line | Line count is monotonic across a full session exercising every action |
| 12 | The active card's elapsed time equals now minus the current interval's `effectiveAt` | Manual desktop check against a back-dated entry |
| 13 | The folded state after a restart equals the state before it | Manual desktop check, as in Phase 0's round-trip |
| 14 | Logging a switch costs one pointer action in the focused window | Manual desktop check |
| 15 | Every state in the screen design is reachable: first run, active, paused, undo, entry list, missed switch | Manual desktop walkthrough |
| 16 | Phase 0's checks still pass and `src/core/` imports neither React nor Tauri | `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `cargo fmt --check`, `cargo clippy -- -D warnings`, `cargo test`, and an import check |

### Inherited constraints

These follow from [Phase 0's decisions](phase-0-repo-setup.md#decisions-and-evidence) and bound
the design:

| Constraint | Consequence for this design |
| --- | --- |
| Append-only JSONL, one file per device | Nothing is edited or deleted. Undo and correction are additional events. |
| Every event carries `id`, `device`, `recordedAt` | Identity for superseding exists; the meaning of an event's own time does not yet. |
| Rust owns durability, TypeScript owns the domain core | The fold from log to current state is a pure function, specified here and tested in the core. |
| Offline-only, no accounts | No remote lookup, no sign-in step, and no network dependency in any logging path. |
| Multi-device use is expected, sync mechanism undecided | Events from two devices may interleave. The design must not assume one writer. |
| Linux (X11) is the only initial target | Quick-access assumptions are recorded for Phase 3, not verified here. |

The multi-device constraint shaped the fold more than any other: effectiveness is defined on
the reference graph rather than on log position, absent targets are retained rather than
dropped, and tracking events referencing unknown topics still produce intervals.

### Product inputs

The [concept discussion](../brainstorming/context-switching-app-concept.md) proposed large topic
buttons, a highlighted active topic with elapsed time, a persistent pause, undo, and easy
timestamp correction. All were evaluated and accepted here, on the evidence of interaction cost
rather than because the document proposed them. Its interest in distinguishing completed work
from interruptions was evaluated and deferred. Its scoring and effort-level material remains a
proposal and no decision here depends on it.

## Work packages

- [x] **Record the tracking model.** Gate questions 1–3 and 7 are answered in
  [Accepted decisions](#accepted-decisions) and [Tracking model](#tracking-model), with
  alternatives in [Rejected alternatives](#rejected-alternatives). No decision depends on an
  unresolved question.

- [x] **Specify the event vocabulary.** [Event vocabulary](#event-vocabulary) gives each kind a
  payload, an emitting action, and its supersedability, mirroring the Phase 0 record shape and
  resolving gate questions 4 and 5. Every action in the tracking model maps to exactly one kind
  and no kind exists without an action.

- [x] **Define undo and correction.** [Folding a log into state](#folding-a-log-into-state)
  states the rule as a deterministic four-step fold, including a revoked revocation and two
  devices superseding the same event, with a [worked example](#worked-example) giving a log in
  and a state out.

- [x] **Design the primary window.** [Screen design](#screen-design) draws first run, active,
  paused, undo, the entry list, and the missed-switch path, with the active topic, elapsed
  time, and the placement of pause, undo, and correction. Interaction steps are counted in
  [Interaction cost](#interaction-cost).

- [x] **Fix the surface boundary.** [Surface boundary](#surface-boundary) assigns every action
  and records the reason, including the accepted cost of keeping topic creation in the window.

- [x] **Write the implementation acceptance checks.**
  [Acceptance checks for the implementation phase](#acceptance-checks-for-the-implementation-phase)
  lists sixteen criteria, each with how it is checked, including the fold example as a test case.

- [x] **Close the phase.** Q05 resolved in the open questions with a link here, readiness
  changed to `Implementation-ready`, roadmap status updated, and navigation links unchanged
  because scope did not change.

## Acceptance and verification

Checked on 6 September 2026.

| Check | Actual result |
| --- | --- |
| Every gate question has a recorded decision with rationale | Passed. Nine questions, each with a row in the [gate table](#investigation-gate) and a linked section; rationale in [Accepted decisions](#accepted-decisions) and [Rejected alternatives](#rejected-alternatives). |
| Every event kind has a name, payload, emitting action, and stated supersedability | Passed. Eight kinds in one table; each user action maps to exactly one kind. |
| The correction rule is a deterministic fold demonstrated on a worked example | Passed. Four ordered steps, with the ten-event example resolving to two stated timelines. |
| Interaction steps recorded for the chosen design and each rejected alternative | Passed. Two tables in [Interaction cost](#interaction-cost). Counted, not measured; recorded as such. |
| Screen design covers first run, ordinary switch, pause and resume, undo, and a late correction | Passed. Five window states plus the quick-access surface. |
| Each action assigned to the window, the quick-access surface, or both | Passed. Nine actions in [Surface boundary](#surface-boundary). |
| No production code added; any prototype deleted and not committed | Passed. No prototype was built and no file outside `docs/` changed. |
| Q05 resolved and linking here; Q07 and Q08 still open | Passed. |
| Local documentation links resolve and phase metadata matches the working rules | Passed. Anchors and relative links checked; readiness is `Implementation-ready`, dependency on Phase 0 matches the roadmap row, and the previous/next chain is unchanged. |

This records a design. It establishes nothing about whether the interaction works in practice;
that is [Phase 5](phase-5-validation-trial.md)'s subject.

## Rollout and rollback

The deliverable is this document. There is no build, release, or user-visible change, and no
external service is involved.

Rollback is reverting the recorded decisions and returning readiness to `Discovery required`,
leaving Q05 open. There is no data compatibility concern: no tracking data exists yet, and the
Phase 0 round-trip log holds only placeholder records. Should the decisions change after the
tracking implementation exists, the append-only log means superseded history is retained, and
the migration cost falls on the fold in the TypeScript core rather than on stored data.
