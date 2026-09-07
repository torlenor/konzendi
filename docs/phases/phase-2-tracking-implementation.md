# Phase 2 — Topic tracking implementation

[Roadmap](../ROADMAP.md#delivery-phases) · prev: [Phase 1](phase-1-tracking-design.md) · next: [Phase 3](phase-3-quick-access.md)

**Depends on:** [Phase 0](phase-0-repo-setup.md), [Phase 1](phase-1-tracking-design.md)  
**Effort:** M  
**Complexity:** M  
**Readiness:** Discovery required

> **Placeholder.** This document records the intended slice and its dependencies only. Its
> scope, work packages, and acceptance checks are written from
> [Phase 1's](phase-1-tracking-design.md) recorded design; the estimates above are provisional
> until then. Do not implement against this outline.

## Investigation gate

Phase 1 answers the product questions. What remains here is implementation shape, and it
cannot be settled before Phase 1's design exists:

- Which of Phase 1's event kinds the Rust store and the TypeScript core each need to know
  about, given that Rust owns durability and the core owns interpretation.
- How the folded current state is held in the interface, and whether the log is re-read or
  the state advanced in memory after each append.
- What happens when an append fails while a switch is being recorded.

## Outcome and scope

The tracking loop as designed in Phase 1: topics, an active topic with elapsed time, switching,
pauses, undo, and timestamp correction, persisted as events in the Phase 0 log and read back
through the TypeScript core.

Out of scope: the global shortcut and tray ([Phase 3](phase-3-quick-access.md)), the timeline
and analytics ([Phase 4](phase-4-timeline-analytics.md)), scoring, synchronization, and
distribution.

## Decisions and evidence

None recorded. The design decisions this phase implements belong to
[Phase 1](phase-1-tracking-design.md#decisions-and-evidence); the storage and logic-split
constraints belong to [Phase 0](phase-0-repo-setup.md#decisions-and-evidence).

## Work packages

Not written yet; they follow from Phase 1's event vocabulary and screen design.

## Acceptance and verification

Phase 1 has written the observable acceptance checks for this phase; see
[Acceptance checks for the implementation phase](phase-1-tracking-design.md#acceptance-checks-for-the-implementation-phase).
In addition, the Phase 0 checks
(`npm run typecheck`, `npm run lint`, `npm test`, `cargo fmt --check`,
`cargo clippy -- -D warnings`) must pass, and no file under `src/core/` may import React or
Tauri.

## Rollout and rollback

Local delivery on the development machine; nothing is published. Rollback is reverting the
tracking code. Data written by this phase is real tracking data: because the log is append-only,
a rollback leaves it readable, and any change to the fold must keep earlier events meaningful.
