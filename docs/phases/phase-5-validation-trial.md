# Phase 5 — Validation trial

[Roadmap](../ROADMAP.md#delivery-phases) · prev: [Phase 4](phase-4-timeline-analytics.md) · next: [Phase 6](phase-6-application-theme.md)

**Depends on:** [Phase 3](phase-3-quick-access.md), [Phase 4](phase-4-timeline-analytics.md)  
**Effort:** M  
**Complexity:** L  
**Readiness:** Discovery required

> **Placeholder.** This document records the intended slice and its dependencies only. The
> trial protocol, participants, and criteria are written before the trial runs; the estimates
> above are provisional. Do not treat this outline as a scheduled trial.

## Investigation gate

Answering these resolves [Q06](../OPEN_QUESTIONS.md):

- Who takes part, on which machines, and for how long? The concept proposes one week with a
  small group; nothing is scheduled.
- What is measured: forgotten switches, how disruptive logging feels, whether the timeline
  shows anything useful, and whether the entry point changes usage.
- What result justifies continuing, and what result would stop or redirect the work? Decide
  this before the data exists.
- How is participant data handled, given that the log stays on each participant's own machine
  and no account or server exists?

## Outcome and scope

A recorded answer to the question the prototype was built for: do switches get logged at all,
and does anyone learn something from the result. The deliverable is evidence and a decision,
not a feature.

Out of scope: building new features in response to findings, scoring, synchronization,
packaging for distribution, and any commercial decision. Those follow from the outcome.

## Decisions and evidence

None recorded. No trial has been planned, scheduled, or conducted.

## Work packages

Not written yet.

## Acceptance and verification

To be written. Findings must be recorded as what was observed, with the number of participants
and the period stated. A small trial cannot establish a productivity or health outcome and must
not be reported as one.

## Rollout and rollback

Distribution to participants is undecided. If the trial needs packaged builds, coordinate with
[Phase 7](phase-7-releases-ci-cd.md) and record that dependency before the trial runs.
Rollback is stopping the trial; participants keep their own log files, which remain
readable without the application.
