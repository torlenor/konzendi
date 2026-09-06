# Phase 4 — Timeline and first analytics

[Roadmap](../ROADMAP.md#delivery-phases) · prev: [Phase 3](phase-3-quick-access.md) · next: [Phase 5](phase-5-validation-trial.md)

**Depends on:** [Phase 2](phase-2-tracking-implementation.md)  
**Effort:** M  
**Complexity:** M  
**Readiness:** Discovery required

> **Placeholder.** This document records the intended slice and its dependencies only. Its
> scope, work packages, and acceptance checks are written once real logged data exists; the
> estimates above are provisional. Do not implement against this outline.

## Investigation gate

- Which analytics are worth showing first? This resolves [Q08](../OPEN_QUESTIONS.md) and should
  be decided against real logged data from Phase 2, not from the candidate list alone.
- What does the timeline show when data is sparse, when logging was forgotten for hours, and
  when events from two devices interleave?
- Does anything shown here need to survive being wrong? An analytic that reads as a measurement
  of productivity or attention must not be presented as one.

No score or effort level is decided here. [Q07](../OPEN_QUESTIONS.md) stays open and is planned
separately, if at all.

## Outcome and scope

Enough feedback for a user to see their own day: a coloured timeline of topics and pauses, plus
the smallest set of analytics that earns its place. The purpose is to make sustained logging
worthwhile during a trial.

Out of scope: the score and effort levels, trends across long periods, reports, comparisons
between users, and anything requiring data the tracking phase does not record.

## Decisions and evidence

None recorded. Candidate analytics are listed in the
[concept discussion](../brainstorming/context-switching-app-concept.md); they are proposals.

## Work packages

Not written yet.

## Acceptance and verification

To be written. Analytics computed in the TypeScript core must be unit-testable without a
window, and their wording must not present a recorded pattern as a validated outcome.

## Rollout and rollback

Local delivery; nothing is published. Rollback is removing the views. Analytics read the event
log and write nothing, so removing them cannot lose tracking data.
