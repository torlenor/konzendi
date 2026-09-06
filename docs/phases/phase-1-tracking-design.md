# Phase 1 — Tracking experience design

[Roadmap](../ROADMAP.md#delivery-phases) · prev: [Phase 0](phase-0-repo-setup.md) · next: [Phase 2](phase-2-tracking-implementation.md)

**Depends on:** [Phase 0](phase-0-repo-setup.md)  
**Effort:** M  
**Complexity:** M  
**Readiness:** Discovery required

## Investigation gate

This phase produces a design, not an application. Investigate and decide the questions below,
record the outcome in [Decisions and evidence](#decisions-and-evidence), then change readiness
to `Implementation-ready` before any tracking code is written.

### Questions to answer

1. **Switch interaction.** Is recording a switch one action (choose the next topic) or two
   (end the current topic, then start the next)? What happens to the running interval, and can
   nothing be active while the application is open?
2. **Topic lifecycle.** Are topics predefined, created while logging, or both? Can they be
   renamed and archived? Is a topic an entity with a stable id, or a plain label carried on
   each event? A stable id is what makes renaming possible without rewriting history.
3. **Pause semantics.** Is a pause a topic, a distinct state, or the absence of an active
   topic? Does it end automatically, and what does a switch during a pause mean?
4. **Event vocabulary.** Which event kinds exist, and what payload does each carry? Phase 0
   stores `{id, device, recordedAt, kind, payload}` and ships one placeholder kind; this phase
   names the real ones.
5. **Event time versus record time.** `recordedAt` is when the line was written. A late or
   corrected entry needs the time it refers to. Does the payload carry a separate effective
   timestamp, and is it required on every event or only where it can differ?
6. **Undo and correction under an append-only log.** The log cannot be edited, so undo and
   timestamp correction must be new events that supersede earlier ones by id. Define which
   events can be superseded, what a superseding event carries, and the deterministic rule the
   TypeScript core applies when folding a log into the current state.
7. **Interruption versus intentional completion.** Is the distinction captured at all? It is
   only worth recording if it costs no extra step in the common case; decide explicitly rather
   than leaving it implied.
8. **Surface boundary.** Which actions must be reachable from the quick-access surface
   (global shortcut, tray) and which may live only in the window. This phase decides the
   boundary; Phase 3 implements the surface.
9. **Missed entries.** What does a user do on returning to a machine after logging nothing for
   hours, and what does the design offer beyond a manual correction?

### Evidence to gather

- The interaction steps required to log a switch, counted for the design and for each rejected
  alternative: keystrokes, pointer actions, and whether the working window loses focus.
- A walkthrough of the states in the sketch for each of: first run with no topics, an ordinary
  switch, a pause and resume, an accidental switch undone, and an entry corrected an hour late.
- Optional bounded experiment: a throwaway clickable sketch used to time the switch
  interaction. If it is run, record the method and the measured steps or times, state the
  sample size, and delete the prototype. It is evidence about the interaction, not about
  whether the habit holds; that is a later trial. No prototype code is committed.

### Decision to record

The user decides. Recording the outcome here resolves
[Q05](../OPEN_QUESTIONS.md); update its status and outcome and link back to this document.
Scoring ([Q07](../OPEN_QUESTIONS.md)) and analytics ([Q08](../OPEN_QUESTIONS.md)) are out of
scope and stay open.

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
and distribution. Designing the interaction does not authorize implementing it; that is a
separate phase planned after this one.

## Decisions and evidence

No decision is recorded yet. This section is filled in when the investigation gate is resolved.

### Inherited constraints

These follow from [Phase 0's decisions](phase-0-repo-setup.md#decisions-and-evidence) and bind
the design:

| Constraint | Consequence for this design |
| --- | --- |
| Append-only JSONL, one file per device | Nothing is edited or deleted. Undo and correction are additional events. |
| Every event carries `id`, `device`, `recordedAt` | Identity for superseding exists; the meaning of an event's own time does not yet. |
| Rust owns durability, TypeScript owns the domain core | The fold from log to current state is a pure function, specified here and tested in the core. |
| Offline-only, no accounts | No remote lookup, no sign-in step, and no network dependency in any logging path. |
| Multi-device use is expected, sync mechanism undecided | Events from two devices may interleave. The design must not assume one writer. |
| Linux (X11) is the only initial target | Quick-access assumptions are recorded for Phase 3, not verified here. |

### Product inputs

The [concept discussion](../brainstorming/context-switching-app-concept.md) proposes large topic
buttons, a highlighted active topic with elapsed time, a persistent pause, undo, and easy
timestamp correction. These are proposals to evaluate in this phase, not requirements.

## Work packages

- [ ] **Record the tracking model.** Answer gate questions 1–3 and 7 with rationale and the
  alternatives considered. Complete when each question has a stated decision that does not
  depend on an unresolved question.

- [ ] **Specify the event vocabulary.** For each event kind: its name, the payload fields and
  their types, the user action that emits it, and whether it can be superseded. Mirror the
  Phase 0 record shape and resolve gate questions 4 and 5. Complete when every action in the
  tracking model maps to exactly one event kind, and no kind exists without an action.

- [ ] **Define undo and correction.** State the superseding rule as a deterministic fold over a
  log ordered across devices, including what happens when a superseding event is itself
  superseded, and when two devices supersede the same event. Include a worked example: a short
  log in, the resulting state out. Complete when the rule is unambiguous enough to implement
  and test without further decisions.

- [ ] **Design the primary window.** A low-fidelity sketch with every state from the walkthrough
  list above, the active topic and elapsed time, and the placement of pause, undo, and
  correction. Record the interaction steps to log a switch. Complete when each walkthrough
  state is drawn and reachable.

- [ ] **Fix the surface boundary.** List the actions the quick-access surface must offer and
  those it need not, with the reason. Resolves gate question 8 and constrains Phase 3.
  Complete when every action in the tracking model is assigned to a surface.

- [ ] **Write the implementation acceptance checks.** The observable criteria the tracking
  implementation phase must satisfy, including the fold example as a test case. Complete when
  each criterion states how it is checked.

- [ ] **Close the phase.** Record the decisions above, resolve Q05 in the open questions with a
  link to this document, change this phase's readiness to `Implementation-ready`, and update
  the roadmap and navigation links if scope changed. Complete when the links resolve and no
  gate question remains unanswered.

## Acceptance and verification

- Every gate question has a recorded decision with rationale; none is left implied.
- Every event kind has a name, a payload, an emitting action, and a stated supersedability.
- The correction rule is stated as a deterministic fold and demonstrated on a worked example
  that an implementer could turn into a test without asking a further question.
- The interaction steps to log a switch are recorded for the chosen design and for each
  rejected alternative.
- The screen design covers first run, ordinary switch, pause and resume, undo, and a late
  correction.
- Each action in the tracking model is assigned to the window, the quick-access surface, or
  both.
- No production code is added by this phase; any prototype used for evidence is deleted and is
  not committed.
- Q05 is `Resolved` in the open questions and links here; Q07 and Q08 remain open and no
  decision here depends on them.
- All local documentation links resolve and phase metadata matches the working rules.

Record the actual result of each check here when it is performed. Nothing is verified by this
plan.

## Rollout and rollback

The deliverable is this document. There is no build, release, or user-visible change, and no
external service is involved.

Rollback is reverting the recorded decisions and returning readiness to `Discovery required`,
leaving Q05 open. There is no data compatibility concern: no tracking data exists yet, and the
Phase 0 round-trip log holds only placeholder records. Should the decisions change after the
tracking implementation exists, the append-only log means superseded history is retained, and
the migration cost falls on the fold in the TypeScript core rather than on stored data.
