# Phase 5 — Validation trial

[Roadmap](../ROADMAP.md#delivery-phases) · prev: [Phase 4](phase-4-timeline-analytics.md) · next: [Phase 6](phase-6-application-theme.md)

**Depends on:** [Phase 3](phase-3-quick-access.md), [Phase 4](phase-4-timeline-analytics.md)  
**Effort:** M  
**Complexity:** L  
**Readiness:** Implementation-ready

> **Owner pilot complete with an accepted protocol exception.** The five-day use period produced
> a useful qualitative result. It did not establish the planned numeric reliability and friction
> gates and does not authorize a small-group trial.

## Investigation gate

The owner accepted the protocol and decision rules on 13 September 2026. The investigation gate
is resolved:

| Question | Decision |
| --- | --- |
| Who takes part, where, and for how long? | The owner is the first participant. The pilot uses the normal x86_64 Linux Mint 22.3, Cinnamon, X11 working machine for five normal workdays. |
| What is measured? | Logging reliability, logging friction, usefulness, and the role of each entry point are recorded separately. |
| What result controls the next step? | Apply the accepted rules in order: repair an unsafe result, redirect and repeat a weak pilot, continue after a useful and sufficiently reliable pilot, or stop expansion after a reliable but not useful pilot. |
| How is participant data handled? | The event log and private work details stay on the participant's machine. Only redacted aggregate evidence enters the repository. |

The pilot must record these four parts separately:

- **Logging reliability:** switches recorded at the time, switches added or corrected later,
  and switches that the participant knows are still absent at the daily review.
- **Logging friction:** whether the participant delays, avoids, or stops logging because the
  interaction interrupts work.
- **Usefulness:** a specific observation from the timeline or readings, and whether that
  observation suggests a useful change or question. A graph that is only interesting does not
  count by itself.
- **Entry point:** the main window, quick switcher, or tray used most often that day, plus cases
  in which an entry point made logging easier or caused the participant not to log.

Konzendi v0.1.1 does not store which entry point created an event. The participant therefore
records the predominant entry point and important exceptions from memory at the daily review.
The protocol does not require a separate note for every switch because that extra action would
change the friction being tested.

## Outcome and scope

A recorded answer to the question the prototype was built for: do switches get logged during
normal computer work, and does the participant learn something useful from the result? The
deliverable is evidence and a decision, not a feature.

This phase includes an owner pilot and, only if that pilot supports it, a later small-group
trial. It includes the protocol, daily observations, a bounded review of the local event log,
and the final continue, redirect, or stop decision.

Out of scope: building features in response to findings, scoring, synchronization, support for
another operating system, commercial decisions, and claims about productivity, cognition, or
health. A finding can propose later work, but this phase does not implement it.

## Decisions and evidence

### Accepted pilot setup

On 13 September 2026, the owner chose to be the first participant and to start on the morning of
14 September 2026. The owner will use the published Konzendi v0.1.1 release on the normal working
machine. The owner also accepted the five-workday protocol and its decision rules. This makes the
first run a pilot of both the application and the trial method. It is not a multi-participant
result.

Workspace inspection on 13 September 2026 found that the machine is x86_64 Linux Mint 22.3
with Cinnamon under X11. This is inside the v0.1.1 release contract. The release supports
x86_64 Ubuntu 24.04 and Linux Mint 22 under X11. The package is unsigned, and its SHA-256
checksum detects corruption but does not identify the publisher.

Version v0.1.1 provides the main window, `Ctrl+Alt+K` quick switcher, tray actions, corrections,
and the day analytics that this pilot needs. It does not record the entry point in the event
payload. Current changes on `main` are outside the pilot. In particular, the unreleased `K`
command that opens the main window from quick access is not part of v0.1.1.

The local event log contains topic names and work times. It stays on the participant's machine.
The repository receives only aggregate counts, ratings, findings, the trial period, and the
final decision. It receives no raw log, topic names, screenshots with work data, or notes that
identify private work. The participant can inspect and redact every recorded finding.

### Accepted protocol

Participant aid: [owner-pilot one-page PDF](phase-5-validation-trial/owner-pilot-onepager.pdf)
([editable HTML source](phase-5-validation-trial/owner-pilot-onepager.html)). The phase document
remains the protocol authority.

The pilot runs for five normal workdays, from Monday 14 September through Friday 18 September
2026. A day on which no normal computer work occurs is recorded as unavailable, not as a failed
day. Extend the end date by one workday for each unavailable day, up to 22 September. Do not
extend the pilot because logging was inconvenient; record that inconvenience as evidence.

Before the first normal work session:

1. Download the four v0.1.1 release assets through authenticated GitHub access. Verify the
   package against `SHA256SUMS`. Install `konzendi_0.1.1_amd64.deb`.
2. Copy `~/.local/share/com.konzendi.app` to a private backup location. The package reads the
   same data as development builds, so the pilot does not require a clean log. Record the pilot
   start time and assess only work after that time.
3. Open Konzendi. Confirm that the existing topics and entries are readable, `Ctrl+Alt+K` opens
   the quick switcher over another application, Stop works, and the Analytics view opens.
4. Create or rename only the topics needed for normal work. Do not create synthetic trial
   events after the pilot start time.

During normal work, the participant uses Konzendi without reminder alarms or a parallel tracker.
Record a switch when the participant notices it. Use **Entries** to add or correct a missed
switch as normal. Do not change working habits only to produce more events.

At the end of each workday, spend no more than five minutes on this review:

| Observation | Daily record |
| --- | --- |
| Normal computer work | Yes, or no with a short reason |
| Known topic switches | Total switches the participant can identify during review |
| Recorded at the time | Count |
| Added or corrected later | Count, including corrections made during this review |
| Still absent | Count and short reason |
| Logging friction | 0 to 4 using the anchors below |
| Predominant entry point | Main window, quick switcher, tray, or mixed |
| Entry-point exception | One short case that helped or prevented logging, or none |
| Analytics observation | One specific observation, or none |
| Suggested action or question | What the observation changes, or none |
| Data confidence | Complete enough to interpret: yes or no, with a short reason |

Use this friction scale:

- **0 — None:** logging did not interrupt the work.
- **1 — Noticeable:** logging took attention but did not delay or prevent an entry.
- **2 — Some disruption:** the participant sometimes delayed an entry or had to return to it.
- **3 — Frequent disruption:** the participant often delayed or avoided entries.
- **4 — Abandoned:** friction caused the participant to stop using Konzendi for part of the day.

The known-switch count is a participant estimate, not ground truth. Report the recorded-at-time,
corrected, and still-absent counts separately. Do not turn them into a precise claim about all
real task switches.

After the last day, review the Analytics view for each pilot day and answer:

1. Which logged pattern, if any, was useful and why?
2. Would the participant choose to keep using v0.1.1 for another week without a trial request?
3. Which entry point supported logging best, and which situations still caused missed entries?
4. Did any installation, persistence, integrity, or privacy problem make the evidence unsafe to
   interpret?

### Accepted decision rules

Apply these rules in order. They are product gates for this pilot, not validated scientific
thresholds.

1. **Do not interpret and repair first** if installation, persistence, log integrity, or a
   privacy concern makes the evidence unsafe. Record the failure. Do not recruit participants
   until the problem has a separate fix and verification.
2. **Redirect and repeat the owner pilot** if product friction caused use on fewer than four
   normal workdays, if fewer than 80% of known switches were present after daily correction, or
   if the median friction rating is above 2. Record the smallest product or protocol change that
   could address the finding. Implement it only in its owning phase.
3. **Continue to a small-group trial** if at least four normal workdays are interpretable, at
   least 80% of known switches are present after daily correction, the median friction rating is
   2 or lower, and the participant records at least one useful observation that suggests an
   action or a question worth testing. Define the next participants and machines before that
   trial starts.
4. **Stop expansion and reconsider the product outcome** if logging meets the reliability and
   friction gates, but the participant records no useful observation and would not choose to
   continue. More participants are not a remedy for an owner pilot that answers the product
   question negatively without an identified alternative hypothesis.

Report all underlying counts and daily ratings with the decision. Do not report only the 80%
comparison or the median.

### Owner use outcome — 19 September 2026

The owner did normal computer work and used Konzendi for the whole day on each of the five
planned workdays, from 14 through 18 September 2026. The owner used v0.1.1 from Monday through
Thursday and changed to the latest available development build on Friday. The exact Friday
revision is not recorded. The build change and the incomplete daily records are deviations from
the accepted protocol.

The owner reconstructed this aggregate evidence on 19 September:

| Observation | Recorded outcome |
| --- | --- |
| Available days | Five of five; normal computer work and whole-day Konzendi use on each day |
| Late recordings | Approximately one or two each day, or approximately 5–10 for the week |
| Correction | The owner noticed the delay when switching the topic, then immediately changed the new entry's start time |
| Known absent work | No topic period longer than approximately 10 minutes is known to be absent; shorter periods and unremembered switches cannot be counted reliably |
| Logging friction | Overall rating 2; daily ratings are not available |
| Entry points | Approximately 70% main window, 30% quick access, and no tray use |
| Data safety | No known installation, persistence, integrity, crash, or privacy problem |
| Analytics review | Approximately three reviews; the graph of past-day timelines was the useful part |
| Continued use | Yes; the owner chose to continue during the next workdays |

The main window was easiest to use when it remained visible on a third screen. Quick access was
not needed while that window was visible. The tray did not come to mind. Late recordings most
often followed a small urgent request in Microsoft Teams. They occurred less often when the
owner remembered another small task. In some of those cases, the visible tracking state prompted
the owner to defer the task and remain on the current topic. This prevented a switch that the
owner otherwise might have made.

The owner had to enter corrected start times manually. The existing 15-minute, 30-minute, and
one-hour quick adjustments were too large for delays that were usually five or ten minutes. The
owner chose five-minute and ten-minute quick adjustments as the first bounded change. [Phase 26](phase-26-fine-grained-time-correction.md)
owns that implementation. The owner will use the new actions before deciding whether a different
correction interaction is necessary.

Tracking still required active thought and was easy to forget when work changed. A small,
always-visible Konzendi mark or dashboard is a candidate reminder, not an accepted solution.
[Phase 27](phase-27-always-visible-tracking-reminder.md) investigates whether such a reminder
helps without becoming distracting before it defines an implementation.

Reviewing the timeline showed no continuous recorded stretch longer than two hours on important
projects. This motivated the owner to check Microsoft Teams less often, group small tasks for one
topic, and preserve more time for complex work. The owner already tries to group meetings to
reduce 30-minute and one-hour gaps, but meeting placement is not always under the owner's
control. These are personal actions prompted by the recorded view. They do not show that session
length measures productivity or concentration.

The owner wants a weekly view of time per topic and extended sessions. [Phase 14](phase-14-further-statistics.md)
owns the first weekly overview and uses this finding as discovery evidence.

The available report does not contain known-switch counts or daily friction ratings. It cannot
establish the logging percentage or calculate the protocol's median friction. The report is
evidence that the application prompted useful questions and that the owner chose to continue.

On 19 September 2026, the owner accepted an explicit exception to the original protocol and
closed the phase on this qualitative result. Repeating the owner pilot only to reconstruct the
numeric gates is not required. This decision does not treat the missing evidence as successful
evidence and does not authorize a small-group trial. A later decision to invite other
participants requires a new protocol and sufficient reliability and friction evidence first.

## Work packages

- [x] **Accept the pilot protocol.** The owner accepted the period, daily record, and decision
  rules on 13 September 2026. This document records the choices and is
  `Implementation-ready`.

- [x] **Resolve the private trial setup.** The owner used v0.1.1 from Monday through Thursday and
  the latest available development build on Friday. The original checksum, backup, and startup
  checks were not recorded. The owner reported no installation, persistence, integrity, crash,
  or privacy problem. The accepted closure exception records these limits instead of claiming
  that the planned preparation was verified.

- [x] **Run the owner pilot.** The owner used Konzendi for five full normal workdays. The owner
  did not complete the daily record. The aggregate interview records what can be reconstructed
  and identifies what remains unknown.

- [x] **Review the evidence.** The phase records the period, available days, aggregate estimates,
  useful observations, continued-use choice, and limitations. The numeric decision rules could
  not be applied. The owner accepted this as a limited qualitative result, not as evidence that
  the numeric gates passed.

- [x] **Plan the next action.** The owner continues personal use. Phase 14 owns the accepted
  weekly-overview work. Phase 26 owns five-minute and ten-minute quick corrections. Phase 27
  owns discovery of an always-visible reminder. A small-group trial is not authorized.

## Acceptance and verification

The original owner-pilot acceptance criteria were:

- the package version, target machine, actual start and end times, and available workdays are
  recorded;
- each available day has the defined daily record, including zero and none values;
- the final review states the aggregate counts, median friction, useful observations, data
  limitations, and whether the participant would continue by choice;
- the final decision follows the accepted rules, or records an explicit exception and its
  rationale;
- the repository evidence contains no raw event log, private topic name, or work screenshot;
  and
- the result says only what this one-participant pilot observed. It makes no productivity,
  cognition, health, or population claim.

Do not prefill successful results. Record actual evidence after each trial day. Completing this
plan alone does not complete the pilot.

### Accepted closure exception

The owner accepted the following closure result on 19 September 2026:

| Original criterion | Result |
| --- | --- |
| Package, machine, period, and available days | Partial. The machine and five-day period are recorded. v0.1.1 was used for four days, but the exact Friday development revision and daily start and end times are not recorded. |
| Complete daily records | Not met. The later interview provides aggregate estimates only. |
| Aggregate counts and median friction | Not met. Late recordings are estimated at 5–10, but there is no known-switch denominator and no daily friction series. |
| Useful observation and continued-use choice | Met. The timeline prompted concrete questions and actions, and the owner chose to continue. |
| Decision under the accepted rules | Replaced by this explicit exception. The numeric gates are unknown, not passed. |
| Privacy and bounded claims | Met. The repository contains only redacted owner observations and makes no population, productivity, cognition, or health claim. |

This accepted exception satisfies the phase outcome by recording an honest answer to the product
question: the owner logged work for five days, found the result useful, and continued using the
application, but the trial did not measure reliability or daily friction well enough to support
expansion. Phase 5 is complete on that limited basis.

## Rollout and rollback

The planned pilot used the private v0.1.1 GitHub release. The owner changed to a development
build on Friday, as recorded above. The trial created no new build or distribution path. Both
builds used the existing `com.konzendi.app` data location and read compatible development logs
unchanged.

To stop the pilot, quit Konzendi and record the stop reason. Removing the package does not remove
the event log. To return to the pre-pilot data state, first copy the current trial data to a
private location if it must be retained, then restore the pre-pilot backup while Konzendi is
closed. Restoring the backup removes the pilot events from the active data directory but does
not change the saved trial copy.

Do not publish the package or send the event log as part of this phase. A later participant must
receive the same privacy statement and a supported package for that participant's machine.
