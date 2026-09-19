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

The owner selected the weekly session overview below. The original candidate list is
historical input, not a requirement to add more readings. Remaining discovery must answer:

- **What does a week of real logging actually look like?** Phase 4 was decided against 32 records
  over three days, most of them verification clicks. Before adding a statistic, measure the shape
  of the data from [Phase 5](phase-5-validation-trial.md): how many topics a day holds, how many
  switches, how long a stretch usually is, how often an entry is corrected, and how often logging
  stops for the day without a stop being recorded.
- **How are empty or incomplete records shown?** Define the empty week and topic states,
  and explain that the view shows recorded sessions without estimating missing entries.
- **How does the user read and navigate the week?** Specify the layout, week navigation,
  local calendar boundaries, and access to entry correction. The accepted week and session
  rules below are fixed inputs to this design.
- **What must not be claimed?** A statistic that reads as a measurement of attention,
  productivity, or health must not be presented as one, whatever it is called. Decide the wording
  with the figure, not after it.

No score and no effort level is decided here. [Q07](../OPEN_QUESTIONS.md) stays open and is
planned separately, if at all.

## Outcome and scope

A Monday-to-Sunday overview of each topic's sessions, their elapsed lengths, and the number
that reached four hours. The owner accepted this direction during discovery. Evidence from
real logging and the remaining rules are still needed before implementation. Calculations
belong in the TypeScript core, are unit-testable without a window, and describe what was logged.

Out of scope: the score and effort levels, comparisons between users, export and reports,
and anything needing data the tracking phases do not record. Gap statistics and comparisons
against the two-session weekly target belong to [Phase 23](phase-23-statistics-v2.md).
Achievements and streaks belong to [Phase 22](phase-22-achievements.md).

## Decisions and evidence

### Owner discovery — 16 September 2026

The owner reports that smaller topics and meetings reduce the time available for sustained
thought on a complex topic. Long gaps between extended sessions make it difficult to resume
that thought. These are owner observations, not measurements from the event log or completed
Phase 5 evidence.

The owner's working hypothesis is that at least four hours on the topic, at least twice per
week, would help. Session duration and the gaps between sessions therefore guide discovery.
Four hours and twice per week are personal targets to investigate, not validated thresholds
for concentration or productivity. The log cannot measure the effort needed to resume thought.

On 19 September 2026, the owner reported a qualitative finding from the Phase 5 use period: the
past-day timeline graphs showed no continuous recorded stretch longer than two hours on
important projects. Seeing this pattern motivated the owner to change how work time is
organized. The owner reviewed Analytics approximately three times during the week and identified
the graph, not the totals or switch count, as the useful part. The Phase 5 report did not include
the full daily counts and ratings from its accepted protocol, so this finding supports the
choice of reading but does not establish the typical shape or completeness of the log.

Accepted session rule:

- A stop of at most 15 minutes followed by the same topic remains part of one session.
  A stop longer than 15 minutes separates sessions. The limit applies to each stop.
- A switch to another topic ends the session, even if the owner returns soon afterward.
- The four-hour target uses elapsed session time, including stops that join two stretches
  under this rule. The owner considers a short break compatible with continued thought on
  the topic. This is the reason for the rule; it is not evidence that the log measures
  mental continuity. For example, two hours on the topic, a 15-minute stop, and another
  one hour and 45 minutes on the same topic meet the four-hour session target.
- Recorded topic time still excludes stops. The example has a four-hour session window
  and three hours and 45 minutes of recorded topic time. A final stop does not add time
  to the session unless tracking resumes on the same topic within the limit.
- There is no lunch exception for now. The owner has not decided whether lunch needs a
  different rule and chose to keep the 15-minute limit during discovery.
- The two qualifying sessions do not need to be spread across the week. There is no
  minimum spacing or separate gap target. For example, sessions on Monday and Tuesday
  can meet the weekly target. This follows the owner's preference; a gap display remains
  an optional proposal, not a condition for meeting the target.
- The weekly target uses a Monday-to-Sunday calendar week, not a rolling seven-day
  window. This matches how the owner wants to review the target.
- Assign the whole session to the week in which it starts. A session that crosses from
  Sunday into Monday keeps its full elapsed length in the earlier week and counts only
  once. This preserves the session across the week boundary.
- Use the same session and weekly target rules for topics for now. The owner does not
  want different targets for individual topics at this stage.

### Accepted weekly overview

The owner accepted a weekly overview that shows each topic's total recorded time, sessions,
session lengths, and how many sessions reached four hours. Show short sessions as well as
qualifying sessions so the owner can see how recorded time is split. Session length uses the
elapsed window defined above, including qualifying short stops. Topic totals use recorded topic
time and exclude stops, consistent with the existing day view.

While the topic is running, show the current session length with "In progress". Include
the session in the weekly qualifying count as soon as its elapsed length reaches four
hours; it does not need to end first. Recompute session lengths and counts after entry
corrections, including counts for earlier weeks. Recognition is not permanently awarded
by these statistics.

In the weekly overview, freeze the session length at the stop time and show "On a break"
while a stop can still join the session. If the same topic resumes within 15 minutes,
include the break in the elapsed session length. If the stop exceeds 15 minutes or
another topic starts, end the session at the original stop time and remove the break
label. A pending stop cannot by itself make the session reach four hours. This display
rule applies to the weekly overview; it does not change the tracking controls.

Keep possibly forgotten sessions in the readings and qualifying counts. The owner changed
the warning threshold to strictly more than 12 hours on 16 September 2026, for both the
existing day view and the planned weekly overview. Exactly 12 hours is not flagged.
For a recorded topic interval longer than 12 hours, mark the session that contains
it as "possibly forgotten", and mark a weekly qualifying count that includes such a session.
The warning lets the user review and correct the entries. It does not cap a duration, exclude
a session, or require confirmation before counting. The owner chose this rule to keep the
counting logic simple. Corrections update the warnings and readings from the corrected log.

Label the current week "Week so far". The owner accepted the session list and four-hour
count as the first version, without gap statistics or a comparison against the two-session
weekly target. This keeps the first view focused on the recorded sessions.

The first version lets the owner navigate between individual weeks. This is sufficient for the
initial question of whether the distribution of recorded time and extended sessions changes.
It does not show a direct comparison, a delta, or two weeks side by side. Those presentations
are later candidates in [Phase 23](phase-23-statistics-v2.md).

The exact layout and the handling of missing records remain open.

### Weekly overview mock

The mock is a discussion aid, not a production style specification. The owner requires
implementation to use the real application's fonts, theme tokens, spacing, controls,
and window layout conventions. Reuse the existing Fira Sans and Fira Mono fonts and
application components where applicable. Do not copy the standalone page shell or its
CSS as a separate visual system. Verify the integrated view at supported window sizes
and in both appearance modes.

The owner requested a graphical representation alongside the list. The
[standalone HTML mock](phase-14-further-statistics/weekly-overview-mock.html) proposes
a seven-column calendar with a full-day time scale, a topic filter, and linked session
details. The owner requested clearer topic identification and accepted using assigned
topic colors, short topic labels where space permits, and a topic legend. The owner then
requested a symbol instead of the "4h+" label because the duration is already shown.
The revised mock uses a diamond (◆) for qualifying sessions, with its meaning in the
legend and accessible description. The symbol choice remains subject to owner review.
The owner removed the heading "Room for a longer session" as unnecessary.
Labels use a neutral background so text contrast does not depend on the topic color.
Small blocks keep their full topic name in selection details and accessible descriptions.
The mock shows two assigned colors; shared colors and topics without a color still need
layout review. The revised mock remains subject to owner review.

The mock uses synthetic records and a fixed clock. It includes the current week, a past
week with a possibly forgotten session, and empty earlier weeks. Appearance, filtering,
week navigation, and session selection work locally without a server. The Day button
shows a placeholder for the existing view. The mock does not calculate sessions from
tracking events or demonstrate all boundary cases.

The past-week fixture includes a 12-hour session without a warning and a 13-hour,
15-minute session with a warning. Both remain in the qualifying counts.

Browser checks passed for navigation, filtering, linked selection, the flagged count,
empty weeks, and appearance controls. Light, dark, and narrow screenshots were inspected.
The narrow chart scrolls horizontally; the page fits the viewport. These are mock checks,
not application acceptance or a physical-display readability check.

The revised mock also passed browser checks for topic colors, the legend, short labels,
the original "4h+" marks, and the 12-hour boundary examples. The separate day-view threshold change
passed all 18 tests in `src/core/day.test.ts`, type checking, lint, and the frontend build.
Tests cover nine hours, exactly 12 hours, 12 hours plus one millisecond, a marked interval
across midnight, and inclusion in the readings. This implements only the requested
threshold change in the existing application; the weekly overview remains a mock.

### Separate achievement scope

The owner decided to move achievement marks and streaks to
[Phase 22](phase-22-achievements.md). Phase 14 owns session statistics and weekly readings.
It does not award achievements or define streaks. This keeps the statistics discovery
independent of decisions about recognition.

### Remaining discovery

Open decisions:

- Complete the integration design: Day/Week navigation, the initial view, topic order,
  empty states, and access to entry correction. The mock is a candidate, not a complete
  interaction contract.
- Specify how the chart draws sessions across midnight or the week boundary while
  retaining the accepted start-week assignment and counting each session once.
- Review shared topic colors, topics without a color, long names, many sessions, and
  short blocks at supported window sizes. Confirm the qualifying-session symbol.
- Decide the wording for missing records. The view must not imply that an empty period
  proves no work occurred.
- What additional Phase 5 evidence describes the typical shape and completeness of the log?
  The qualitative 19 September finding supports showing sessions in a weekly overview, but it
  does not answer this quantitative question.

The owner assigned gap statistics and comparisons against the two-session weekly target
to [Phase 23](phase-23-statistics-v2.md). Their definitions remain open there and do not
block this phase. The original candidates, including the two that
[Phase 4](phase-4-timeline-analytics.md#rationale) deferred, are not part of the accepted
weekly overview.

Two constraints are inherited rather than open:

- Stopped time is absence, not a subject: it contributes no recorded topic time and has
  no timeline lane. See [Phase 13](phase-13-stop-replaces-pause.md#accepted-decisions).
  The accepted session rule adds an elapsed window that can include short stops; it does
  not change the existing topic totals.
- Optional topic colors are accepted by [Phase 16](phase-16-topic-quick-keys.md).
  This replaces the earlier restriction to state colors. Names and other non-color signals
  must still identify topics and states.

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
