# Phase 14 — Further statistics

[Roadmap](../ROADMAP.md#delivery-phases) · prev: [Phase 13](phase-13-stop-replaces-pause.md) · next: [Phase 15](phase-15-stable-topic-numbering.md)

**Depends on:** [Phase 4](phase-4-timeline-analytics.md), [Phase 5](phase-5-validation-trial.md)  
**Effort:** M  
**Complexity:** M  
**Readiness:** Implementation-ready

> **Discovery is complete.** [Phase 4](phase-4-timeline-analytics.md) deliberately shipped the
> smallest set of readings and deferred the rest until real logging exists to judge them
> against. The investigation gate holds that judgement, and it is answered and recorded on
> 19 September 2026. Implement what the decisions below say. A change to a decision needs a
> new record here, not a change in the code alone.

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

Gate status on 19 September 2026:

| Question | Status |
| --- | --- |
| What does a week of real logging look like? | Answered in [Log measurement](#log-measurement--19-september-2026), measured against the work-machine log of 14 to 18 September 2026. |
| How are empty or incomplete records shown? | Answered in [Accepted integration design](#accepted-integration-design--19-september-2026). |
| How does the user read and navigate the week? | Answered in [Accepted integration design](#accepted-integration-design--19-september-2026). |
| What must not be claimed? | Answered in [Accepted integration design](#accepted-integration-design--19-september-2026). |

No score and no effort level is decided here. [Q07](../OPEN_QUESTIONS.md) stays open and is
planned separately, if at all.

## Outcome and scope

A Monday-to-Sunday overview of each topic's sessions, their elapsed lengths, and the number
that reached four hours. The owner accepted this direction during discovery. The rules, the
integration design, and the evidence from real logging are recorded below. Calculations
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

The accepted integration design below gives the layout and the handling of missing records.

### Weekly overview mock

The mock is a discussion aid, not a production style specification. The owner requires
implementation to use the real application's fonts, theme tokens, spacing, controls,
and window layout conventions. Reuse the existing Fira Sans and Fira Mono fonts and
application components where applicable. Do not copy the standalone page shell or its
CSS as a separate visual system. Verify the integrated view at supported window sizes
and in both appearance modes.

The owner requested a graphical representation alongside the list. The
[standalone HTML mock](phase-14-further-statistics/weekly-overview-mock.html) proposes
a seven-column calendar with a time scale, a topic filter, and linked session
details. The owner requested clearer topic identification and accepted using assigned
topic colors, short topic labels where space permits, and a topic legend. The owner then
requested a symbol instead of the "4h+" label because the duration is already shown.
That revision used a diamond (◆) for qualifying sessions. On 19 September 2026, the owner
replaced the diamond with a filled edge on the block. The accepted integration design below
holds the current rule.
The owner removed the heading "Room for a longer session" as unnecessary.
Labels use a neutral background so text contrast does not depend on the topic color.
Small blocks keep their full topic name in selection details and accessible descriptions.
The first revision showed two assigned colors. The revision of 19 September 2026 adds a
shared color and a topic without a color.

The mock uses synthetic records and a fixed clock. It includes the current week, a past
week with a possibly forgotten session, a week with the density of the measured log, and
empty earlier weeks. Appearance, filtering,
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

### Mock revision — 19 September 2026

The mock now follows the accepted integration design. The diamond is removed. A session of
four hours or longer carries a filled ink edge on the left side of its block. The axis holds
only the hours the week records. The blocks keep a minimum height, and a block that
continues past midnight has a broken lower edge.

The fixtures now also hold a topic with no color, two topics that share one color, a session
that continues past midnight, and a session that starts on Sunday and ends on Monday. The
Sunday session shows four hours in the readings and two hours in the chart, because the
chart draws the part before midnight only.

Checks on 19 September 2026 used a headless browser at 1280 and 420 pixels, in the light
and the dark appearance. The screenshots show the cropped axis with equal label intervals,
the filled edge on a qualifying session in both appearances, the broken lower edge on the
two sessions that continue past midnight, the hatched mark and the words on the possibly
forgotten session, the 12-hour session without a mark, the neutral fill of the topic with
no color, the legend that separates two topics with the same color, the empty week, and the
empty result of a topic filter. The narrow chart scrolls horizontally, and the page fits the
viewport. These are mock checks. They are not application acceptance, and they are not a
readability check on a physical display.

The mock shows a session "In progress". It does not show a session "On a break", because a
break can only be pending at the current time. The implementation must show both.

The measurement of 19 September 2026 added a third fixture week. It holds the same number of
sessions each day as the measured week, the same length distribution, and the same day
spans. Its times are synthetic, and it holds no record from the measured log. The
screenshots of this week show that the chart becomes a stack of narrow blocks, and that a
filter on one topic gives a clear reading of the same week. The
[Design consequences](#design-consequences-of-the-measurement--19-september-2026) hold what
follows from this.

### Mock alignment with the application — 19 September 2026

The mock was built again on the conventions of `src/App.css` and the existing views, so that
the layout can be judged as part of the application and not as a separate page. The window
shell and the bar above it stay mock furniture.

What the mock now takes from the application:

- The theme tokens and their names, including `--ink-soft`, `--ink-faint`, `--rule`,
  `--edge`, and `--live`, with the same light and dark values.
- Fira Sans for prose and Fira Mono with tabular figures for each number: the durations, the
  clock times, the hour labels, and the counts.
- The type scale of the application: the centered heading of the day view, the note size, and
  the reading sizes.
- `button.quiet` for each control, with `aria-pressed` for the `Day` and `Week` pair. The
  mock no longer uses a filled tab, because the application has no tab style.
- The navigation of the day view: `‹ Previous`, the centered heading, `Next ›`, and
  `This week`, which is the position that `Today` holds in the day view.
- The `readings` list of the day view for the three readings of each topic, and the `pick`
  row of the topic list for each session.
- The round topic swatch, the segment outline in `--rule`, the hatch of a possibly forgotten
  stretch, the one-pixel mark for the current time, the panel for the selection details, and
  the note with the left bar for the warning below the list.
- The topic colors of the mock are now the application's own suggestions from
  `src/topicColor.ts`, which are checked for contrast against the surfaces of both themes.
- The application's duration format. A length now reads `4:15`, not "4h 15m".

Browser checks on 19 September 2026, at 1280 and 430 pixels in both appearances: the current
week, the past week with a selected session that continues past midnight, the dense week, an
empty week, and a topic filter with no result. The screenshots show the readings of each
topic, the selection ring on a block and on its row, the filled edge of a qualifying session,
the broken lower edge, the hatch and its note, the colorless topic in the state color, and
the axis that states its span. These are mock checks. They are not application acceptance,
and they are not a readability check on a physical display.

### Log measurement — 19 September 2026

The development log in this workspace does not describe normal work. It holds 102 records,
six topics, and a median stretch shorter than one minute. Three days of the
[Phase 5](phase-5-validation-trial.md) period hold no topic interval at all. The Phase 5 use
period was on the owner's work machine.

On 19 September 2026, the owner supplied the work-machine log for one aggregate measurement.
The measurement is read-only. The log file stays outside the repository and is not committed.
This document holds no topic name, work time, or record from that log. The numbers below are
local days of the five workdays from 14 to 18 September 2026.

**The log as a whole.** 123 records, seven topics, and 84 tracking entries.

**Each day.** The day holds four to six topics and nine to 19 switches. The recorded topic
time is between five hours 55 minutes and eight hours two minutes. The first start of a day
is between 06:58 and 08:30, and the last end is between 12:55 and 17:11. Each of the five
days ends with a recorded stop.

**Stretches.** The log holds 66 topic stretches. The median stretch is 22 minutes, the
quartiles are seven and 45 minutes, and the longest stretch is three hours 32 minutes. 24
stretches are shorter than 15 minutes. Nine are longer than one hour, and two are longer
than two hours. No stretch is longer than 12 hours, therefore no stretch of this week gets
the possibly forgotten mark.

**Stops.** The log holds 11 stops. The shortest stop is 25 minutes and the median stop is
one hour 43 minutes. Five stops are longer than six hours and separate two workdays.

**Sessions under the accepted rule.** The week holds 66 sessions. The sessions are the same
as the stretches, because no stop is 15 minutes or shorter, therefore no stop joins two
stretches. 43 sessions are shorter than 30 minutes, ten are one hour or longer, two are two
hours or longer, and none is four hours or longer.

**Recorded time for each topic in the week.** 12 hours, nine hours one minute, four hours 20
minutes, four hours one minute, three hours 12 minutes, two hours five minutes, and 24
minutes. The total is approximately 35 hours.

**Corrections.** The log holds 24 corrected start times and seven revocations. It holds no
automatic brief-selection correction, because v0.1.1 does not have that function. A
correction moves an entry earlier by a median of 16 minutes, with quartiles of eight and 36
minutes and a maximum of one hour 42 minutes. 12 of the 24 corrections are 15 minutes or
less, and seven are more than 30 minutes. Approximately one entry in three is corrected,
therefore the weekly readings must recompute after a correction, as the accepted overview
requires.

### Design consequences of the measurement — 19 September 2026

These results follow from the measurement. They do not change an accepted rule.

**The four-hour count is zero for each topic in the measured week.** The longest session is
three hours 32 minutes. A weekly view that shows only this count therefore gives a column of
zeros, and it does not show how near a topic came to the target. The owner must decide
whether the head of each topic also shows the longest session of the week.

**The 15-minute rule joined no session in this week.** The shortest stop is 25 minutes. A
session therefore ends at each stop and at each switch, and four hours on one topic needs
four hours without a stop and without a switch. This is what the accepted rule says. The
measurement shows what the rule costs, and the owner must decide if the limit stays at 15
minutes.

**A week holds approximately 13 sessions a day.** The chart draws a stack of narrow blocks at
this density. The topic filter gives the clear reading: one topic in one week shows its long
sessions and its short ones immediately. The implementation must therefore keep the filter
easy to reach, and it must give the chart more height than the 360 pixels of the mock.

**Two topics with the same color are difficult to separate at this density**, because most
blocks are too short to hold a label. The name, the legend, and the selection details keep
the identity, as the accepted design says. A different color for each topic makes the chart
easier to read, but the application does not enforce it.

**The axis crop keeps approximately half of the height.** The measured week starts at 06:58
and ends at 17:11, therefore the axis holds 06:00 to 18:00 instead of a full day.

**Corrections of five and ten minutes are smaller than a usual correction.** The median
correction is 16 minutes. This is evidence for [Phase 26](phase-26-fine-grained-time-correction.md),
which owns the quick adjustments. Phase 14 records the number and changes nothing there.

### Accepted integration design — 19 September 2026

The owner made these decisions on 19 September 2026. They replace two properties of the
mock: the diamond mark and the 24-hour axis.

**Analytics opens on the day view.** Analytics keeps its present behavior and opens on
today's timeline. A `Day` and `Week` pair of controls at the top of Analytics selects the
view. The application does not store which view was open last.

**Both views share one anchor day.** The day view already holds an anchor day. The week
view shows the Monday-to-Sunday week that contains that anchor. `‹ Previous` and `Next ›`
move the anchor seven local days. `This week` returns to the current week. `Next ›` and
`This week` are not available on the current week, as in the day view. A day name in the
chart moves the anchor to that day and opens the day view. A change of view therefore
never loses the period the user looks at.

**Topic order follows the topic registry.** The session list and the legend use the order
of the topic registry, which is creation order. A topic keeps its position from one week to
the next. The list and the legend show only the topics that hold a session in the week. The
filter lists `All topics` and every topic, so that the user can ask whether a week holds a
topic at all. A topic that holds no session in the week gives the empty result below, and
the filter keeps its topic during week navigation. An archived topic that holds a session in
the week stays visible, because the log keeps its entries.

**The chart axis shows only the hours the week holds.** The chart keeps seven columns for
Monday to Sunday. The vertical axis starts and ends at the whole hours that contain the
first start and the last end of the sessions the view shows. The span is never shorter than
six hours. The chart adds the missing hours before and after the recorded range in equal
parts, and does not go past midnight at either end. A week that holds no session uses 08:00
to 18:00. The axis then grows outward to the first and the last label. The interval between
labels is one, two, three, or four hours, and the axis holds a maximum of eight labels.
Each of these intervals divides 24, therefore a label always falls on midnight. A line below
the chart and the accessible description of the chart both give the span, so that a short
axis cannot look like a full day. The topic filter changes the sessions the view shows, and
therefore it can also change the span. Today's column carries the mark for the current time.

**A session block shows the part of the session that is in its start day.** The block
starts at the start clock time of the session. Its height is the length inside the start
day. The duration in the block, in the session row, and in the description is the full
elapsed length of the session. A block that continues past midnight has a broken lower
edge, and the row and the description say that the session continues into the next day.
The column of the next day does not repeat the block. A session that starts on Sunday and
ends on Monday stays in the earlier week only, which keeps the accepted start-week
assignment and counts the session one time.

**A short session keeps a minimum height.** A block is at least six pixels high, so that a
short session stays visible and selectable. Sessions never overlap, because a switch to
another topic ends a session. If two minimum-height blocks touch, the chart moves the later
block down by the necessary pixels and keeps a gap of one pixel. This is a correction of
the drawing only. The exact times stay in the session row and in the description.

**The topic color fills the block, and no text sits on it.** A block uses the topic color
with the theme rule outline, as the day view does. A topic that has no color uses the state
color, which is also what a lane of the day view does. A short topic label sits on a neutral
chip inside the block when the height of the block permits it. Long names are cut in the
chip. The legend, the session row, the selection details, and the accessible description
always give the full topic name. Two topics can hold the same color, therefore the color
never identifies a topic alone.

In the rest of the application, a topic without a color has no swatch beside its name. The
chart legend is different: its mark shows the fill that the chart uses, because the legend
connects a fill to a topic. The words "no color" say that the user did not choose that
fill.

**A qualifying session carries a filled edge.** A session of four hours or longer carries a
solid edge, three pixels wide, on the left side of its block. The edge uses the ink token.
It does not use the live, rest, or alarm token, because a qualifying session is not a
tracking state. The session row and the accessible description say "4 hours or longer" in
words. The legend explains the edge. This replaces the diamond in the mock. The duration
already gives the number, and the edge marks the state.

**The head of each topic gives three readings.** The head shows the recorded topic time of
the week, the longest session of the week, and the number of sessions of four hours or
longer. For example: "12h 00m recorded · longest 3h 32m · 0 sessions of 4 hours or longer".
The recorded time excludes the stops that a session length can include. The owner accepted
the longest session on 19 September 2026, because the count is zero for each topic in the
measured week and a count alone does not show how near a topic came to the target.

**The limit that joins two stretches stays at 15 minutes.** The owner confirmed the limit on
19 September 2026, after the measurement showed that no stop of the measured week is 15
minutes or shorter. The measurement shows what the rule costs. It is not a reason to change
a target before the view is in use.

**A possibly forgotten session keeps the day-view marks.** The block uses the existing
hatch pattern, and the words say why. The reading above the list says that the count holds
a possibly forgotten session.

**Selection details give access to correction.** The selection details name the topic, the
day, both clock times, the duration, the short stops the length contains, and the warnings.
A `Correct entries` action opens the Entries view. The first version does not scroll to the
entry or select it. The entry list is in time order, and the details give the times to look
for.

**Wording for missing and incomplete records.** The view uses these words:

- Current week: "Week so far", with the day and time it reaches.
- A week with no session, whatever the reason: "No sessions are recorded for this week."
  and "Konzendi shows only what it recorded. An empty week does not mean that no work
  happened." A week before the first record uses the same words, because the log cannot
  show which of the two cases is true.
- A topic filter with no session: "No sessions are recorded for this topic in this week."
- A running session: "In progress". A stop that can still join the session: "On a break".
- Below the list: "Session lengths include stops of up to 15 minutes when the same topic
  continues. A switch to another topic starts a new session. Only recorded sessions are
  shown. Konzendi does not estimate missing entries."

**What the view must not claim.** The view uses the word "recorded" for every quantity. It
does not use "focus", "attention", "concentration", "productivity", or "deep work". It
names the count exactly what it is: the number of sessions of four hours or longer. It does
not name the count an achievement, a score, or a result. The text that gives the session
rule stays beside the session lengths, so that the user always knows what a length
contains.

### Separate achievement scope

The owner decided to move achievement marks and streaks to
[Phase 22](phase-22-achievements.md). Phase 14 owns session statistics and weekly readings.
It does not award achievements or define streaks. This keeps the statistics discovery
independent of decisions about recognition.

### Remaining discovery

The investigation gate is answered. The accepted integration design closes the integration
and the navigation, the drawing across midnight and the week boundary, the color and label
rules at supported window sizes, and the wording for missing records. The log measurement
answers the shape of a week of real logging. The layout rules still need a check in the
running application when implementation starts.

The measurement opened two small decisions, which the owner must answer before the work
packages are written:

- Does the head of each topic also show the longest session of the week? The four-hour count
  is zero for each topic in the measured week.
- Does the limit that joins two stretches stay at 15 minutes? No stop of the measured week
  is 15 minutes or shorter.

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

- [ ] **Weekly sessions in the core.** Add `src/core/week.ts`. It takes the folded state, the
  two instants of the local week, and the clock. It gives the sessions of each topic, the
  elapsed length of each session, the recorded topic time of each topic, the longest session,
  the number of sessions of four hours or longer, and the marks for a running session, a
  pending stop, and a possibly forgotten session. The module is pure and total, and it imports
  neither React nor Tauri. Add `src/core/week.test.ts` with hand-computed values. The tests
  must cover a stop of exactly 15 minutes that joins two stretches, a stop of 15 minutes and
  one millisecond that separates them, a switch that ends a session, a session that continues
  past midnight, a session that starts on Sunday and ends on Monday, a running session that
  reaches four hours, a pending stop that cannot make a session reach four hours, a correction
  that changes the count of an earlier week, and an interval longer than 12 hours.

- [ ] **The week view.** Add the `Day` and `Week` controls to Analytics, and add the week view
  with its navigation, topic filter, legend, chart, session list, selection details, and the
  `Correct entries` action. Analytics opens on the day view. The two views share the anchor
  day.

- [ ] **The chart.** Draw the seven columns, the cropped axis and its labels, the blocks with
  their minimum height and the correction that keeps them apart, the clip at midnight with the
  broken lower edge, the filled edge of a qualifying session, the hatch of a possibly forgotten
  session, the topic colors, the neutral label chips, and the mark for the current time. Keep
  the height of the chart at 26rem or more, as the mock has it, because a usual day holds
  approximately 13 sessions.

- [ ] **Words and accessibility.** Use the accepted wording. Give each block, row, and control
  a name that a screen reader reads correctly. Keep the contrast at WCAG 2.2 AA in both
  appearance modes. Do not use a state color for the qualifying edge.

- [ ] **Verification and release note.** Run the checks below, record the evidence, and add a
  short entry to `CHANGELOG.md`.

## Acceptance and verification

The phase becomes `Done` only when this evidence is recorded:

- `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` pass, and
  `src/core/week.test.ts` covers each case of the first work package against hand-computed
  values.
- The running application shows the week view. Use the
  [desktop-testing skill](../../.claude/skills/desktop-testing) and record what was seen: week
  navigation and
  the return to the current week, the axis with its span, a session that continues past
  midnight, a session that starts on Sunday, the filter on one topic, the empty week, the
  empty result of a topic filter, a running session, and a possibly forgotten session.
- The view is readable in both appearance modes at WCAG 2.2 AA, and at the supported window
  sizes of [Phase 18](phase-18-window-content-fit.md).
- Each reading agrees with the day view for the same period, or the difference has a recorded
  reason. A figure that cannot be checked against the chart above it needs a reason to exist.
- No figure is presented as a measurement of attention, productivity, or health, and the view
  holds none of the words that the accepted design excludes.

## Rollout and rollback

Local delivery; nothing is published. Rollback is removing the added figures. Statistics read the
event log and write nothing, so removing them cannot lose tracking data. If a figure needs data
the log does not hold, that is a tracking change and belongs to its own phase, not to this one.
