# Phase 14 — Further statistics

[Roadmap](../ROADMAP.md#delivery-phases) · prev: [Phase 13](phase-13-stop-replaces-pause.md) · next: [Phase 15](phase-15-stable-topic-numbering.md)

**Depends on:** [Phase 4](phase-4-timeline-analytics.md), [Phase 5](phase-5-validation-trial.md)  
**Effort:** M  
**Complexity:** M  
**Readiness:** Discovery required

> **Discovery first.** [Phase 4](phase-4-timeline-analytics.md) deliberately shipped the smallest
> set of readings and deferred the rest until real logging exists to judge them against. This
> phase opens with that judgement. Do not write production code against this plan before the
> investigation gate is answered and recorded.

## Investigation gate

This phase must answer:

- **Which of the deferred candidates earns a place?** Phase 4 deferred two by name: the typical
  (median) uninterrupted stretch per topic, and the topics most often switched between. The
  [concept discussion](../brainstorming/context-switching-app-concept.md#6-analytics) also lists
  switches per tracked hour, planned transitions against interruptions, and historical trends.
  Each is a proposal, and the list is not a plan.
- **What does a week of real logging actually look like?** Phase 4 was decided against 32 records
  over three days, most of them verification clicks. Before adding a statistic, measure the shape
  of the data from [Phase 5](phase-5-validation-trial.md): how many topics a day holds, how many
  switches, how long a stretch usually is, how often an entry is corrected, and how often logging
  stops for the day without a stop being recorded.
- **Does a figure survive a sparse day?** A median over three stretches, or a switch rate over a
  day with two hours logged, is arithmetic without meaning. Decide for each accepted figure what
  it shows when there is too little data, and prefer showing nothing to showing a number that
  cannot be read.
- **Is more than one day needed?** Every reading so far is inside one local day. A trend, a
  comparison, or "switches per tracked hour this week" needs a span, which needs a decision about
  what a week is, what an incomplete day does to it, and whether stopped time counts as time.
- **What must not be claimed?** A statistic that reads as a measurement of attention,
  productivity, or health must not be presented as one, whatever it is called. Decide the wording
  with the figure, not after it.

No score and no effort level is decided here. [Q07](../OPEN_QUESTIONS.md) stays open and is
planned separately, if at all.

## Outcome and scope

The second set of readings, chosen against real logged data rather than against a candidate list,
and implemented in the same shape as the first: computed in the TypeScript core, unit-testable
without a window, and worded as what was logged.

Out of scope until the gate is answered: the score and effort levels, comparisons between users,
export and reports, anything needing data the tracking phases do not record, and any figure whose
meaning depends on a threshold nobody has evidence for.

## Decisions and evidence

None recorded. The candidates named in the gate are proposals, including the two that
[Phase 4](phase-4-timeline-analytics.md#rationale) deferred by name.

Two constraints are inherited rather than open:

- Stopped time is absence, not a subject: it is not measured and not drawn. See
  [Phase 13](phase-13-stop-replaces-pause.md#accepted-decisions).
- Colour carries state, not identity, so a new figure gets no topic hue. See
  [Phase 6](phase-6-application-theme.md#accepted-direction-readout) and
  [Phase 4](phase-4-timeline-analytics.md#rationale).

## Work packages

Not written yet. They are written once the gate is answered and the readiness of this document
changes to `Implementation-ready`.

## Acceptance and verification

To be written with the work packages. Whatever is accepted must satisfy the rules the first set
already follows: computed in `src/core/`, pure and total, tested against hand-computed values,
readable in both appearance modes at WCAG 2.2 AA, and worded so that no recorded pattern is
presented as a validated outcome. A figure that cannot be checked against the timeline above it
needs a reason to exist.

## Rollout and rollback

Local delivery; nothing is published. Rollback is removing the added figures. Statistics read the
event log and write nothing, so removing them cannot lose tracking data. If a figure needs data
the log does not hold, that is a tracking change and belongs to its own phase, not to this one.
