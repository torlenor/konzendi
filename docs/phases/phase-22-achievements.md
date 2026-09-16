# Phase 22 — Achievements

[Roadmap](../ROADMAP.md#delivery-phases) · prev: [Phase 21](phase-21-game-detection.md) · next: [Phase 23](phase-23-statistics-v2.md)

**Depends on:** [Phase 14](phase-14-further-statistics.md)  
**Effort:** M  
**Complexity:** M  
**Readiness:** Discovery required

## Investigation gate

Before implementation, review examples from the Phase 14 session rules with the owner:

- Which recorded events earn recognition? A four-hour session is the initial candidate.
- What defines a streak: consecutive qualifying weeks on one topic, or sessions across
  topics? Two qualifying sessions per week on the same topic is a proposal, not a decision.
- Where and when does recognition appear? Should it be optional? Review whether the
  presentation supports the owner without adding pressure or interrupting a session.
- How do incomplete weeks, missed weeks, open sessions, forgotten stops, and corrections
  affect recognition? Is recognition computed from the current log or stored separately?

Gather synthetic examples for these cases and owner feedback on wording and presentation.
Record accepted rules and rationale before writing production code.

## Outcome and scope

Recognition of recorded session milestones and repeated patterns. Phase 14 owns session
statistics; this phase owns achievement marks and streaks based on those statistics.
Gap statistics and weekly target comparisons belong to [Phase 23](phase-23-statistics-v2.md).
Navigation order does not make that phase a prerequisite for achievements.

Scores, effort levels, comparisons between users, and claims about concentration,
productivity, or health are outside this phase. Q07 remains separate.

## Decisions and evidence

On 16 September 2026, the owner proposed an achievement when a topic session reaches
four hours, and recognition for maintaining a streak. The owner then chose a separate
phase for this work. This separates statistics from recognition and lets Phase 14
discovery continue without a streak definition.

Only the phase separation is accepted. Achievement rules, streak rules, presentation,
and storage remain open. No trial evidence for achievements has been collected.

## Work packages

- [ ] Review milestone and streak examples with the owner. Complete when the rules,
  including corrections and incomplete data, are accepted and recorded here.
- [ ] Review presentation and wording with the owner. Complete when the display location,
  timing, and optional behavior are decided.
- [ ] Define implementation work packages, data compatibility, acceptance checks, and
  rollout and rollback after discovery. Then change readiness.

## Acceptance and verification

Discovery is complete when the owner has accepted the rules and presentation, each rule
has a checkable example, and the implementation plan defines verification for ordinary
and exceptional cases. Production acceptance must include corrected entries, week
boundaries, incomplete data, accessible presentation, and accurate wording.

No implementation or verification result is recorded yet.

## Rollout and rollback

Discovery changes documentation only. No application rollout is part of this step.
Before implementation, define how to remove achievement displays without changing
tracking records. If recognition needs stored state, specify its compatibility and
recovery behavior first.
