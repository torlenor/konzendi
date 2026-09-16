# Phase 23 — Statistics v2

[Roadmap](../ROADMAP.md#delivery-phases) · prev: [Phase 22](phase-22-achievements.md) · next: none

**Depends on:** [Phase 14](phase-14-further-statistics.md)  
**Effort:** M  
**Complexity:** M  
**Readiness:** Discovery required

## Investigation gate

Review use of the Phase 14 weekly overview before choosing additional readings. Do not
write production code until the owner accepts the definitions and the implementation plan.

- Does a gap display help the owner understand the time between extended sessions?
  Decide whether gaps run from the end of one qualifying session to the start of the
  next, whether to show time since the latest session, and what to show with fewer than
  two sessions. Decide how short sessions and missing records affect the explanation.
- How should the view compare the qualifying count with the personal target of two
  sessions per Monday-to-Sunday week? Decide the wording for the current week, an empty
  week, and a past week with incomplete logging. A missing record cannot establish that
  no session occurred.
- Which readings earn space in the view? Review synthetic examples and redacted owner
  observations from use of Phase 14. Record whether each reading answers a useful question.
- How do corrections, running sessions, short stops, week boundaries, and possibly
  forgotten intervals affect each reading? Reuse Phase 14 rules where applicable.

The owner decides the useful readings and presentation. Record the evidence and rationale,
including a decision to defer or remove a candidate if it adds no useful information.

## Outcome and scope

Follow-up statistics for gaps between sessions and comparisons against a weekly session
target. Phase 14 provides the weekly session list, elapsed lengths, and four-hour count.
This phase investigates additions to that view; it does not redefine its session rules.

Achievements and streaks belong to [Phase 22](phase-22-achievements.md). Scores, effort
levels, comparisons between users, exports, and new tracking data are outside this phase.
Other historical statistics candidates are not automatically included.

## Decisions and evidence

On 16 September 2026, the owner accepted a first version with each topic's sessions,
their lengths, and the count that reached four hours. The current week is labeled
"Week so far". The owner requested a separate phase document for the follow-up work.

The owner's working hypothesis is that two four-hour sessions per week on a complex
topic would help. The sessions do not need to be spread out. There is no gap target.
The owner reports that long gaps make it difficult to resume thought, but the log does
not measure that effort. Gap statistics and target comparisons remain design candidates;
the phase assignment does not establish their usefulness or accept a particular display.

No evidence from use of the Phase 14 overview is recorded yet.

## Work packages

- [ ] Review the first overview with the owner. Complete when this document records
  redacted observations and the question each candidate should answer.
- [ ] Define each selected reading with hand-computed examples, sparse and incomplete
  data cases, corrections, and calendar boundaries. Complete when the owner accepts
  the definitions and wording.
- [ ] Define the interface, pure core calculations, implementation packages, acceptance
  checks, and delivery and recovery steps. Change readiness only when these are concrete.

## Acceptance and verification

Discovery is complete when each candidate is accepted, deferred, or removed with a reason,
and each accepted reading has a formula, examples, display rules, and an implementation
plan. Implementation checks must cover corrections, sparse data, partial weeks, and
flagged intervals. Verify accessible presentation in both appearance modes and wording
that describes recorded behavior without claims about concentration or productivity.

No implementation checks have run for this phase.

## Rollout and rollback

Discovery changes documentation only. The planned readings use the existing event log
and write no tracking events. Before implementation, define local delivery and removal
of the added readings while retaining Phase 14 and all tracking data. Any proposed
stored preference needs an explicit compatibility and rollback plan.
