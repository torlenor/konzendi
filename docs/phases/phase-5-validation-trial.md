# Phase 5 — Validation trial

[Roadmap](../ROADMAP.md#delivery-phases) · prev: [Phase 4](phase-4-timeline-analytics.md) · next: [Phase 6](phase-6-application-theme.md)

**Depends on:** [Phase 3](phase-3-quick-access.md), [Phase 4](phase-4-timeline-analytics.md)  
**Effort:** M  
**Complexity:** L  
**Readiness:** Implementation-ready

> **Owner pilot scheduled.** The accepted protocol starts with normal work on the morning of
> 14 September 2026. Do not interpret an incomplete pilot as validation evidence.

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

## Work packages

- [x] **Accept the pilot protocol.** The owner accepted the period, daily record, and decision
  rules on 13 September 2026. This document records the choices and is
  `Implementation-ready`.

- [ ] **Prepare the private trial installation.** Verify the v0.1.1 assets and checksum, back up
  the existing application data, install the package, and run the four startup checks. Complete
  when the installed release is ready for normal work and no synthetic event exists inside the
  recorded pilot period.

- [ ] **Run the owner pilot.** Use the release during normal computer work and complete one
  bounded review for each available workday. Complete when five normal workdays are recorded or
  the participant stops early and records why.

- [ ] **Review the evidence.** Aggregate only the counts and findings defined by the protocol.
  Apply the decision rules in order. Complete when the phase records the period, available days,
  daily observations, aggregate counts, limitations, and the continue, redirect, or stop
  decision.

- [ ] **Plan the next action.** If the decision is continue, add the accepted small-group
  protocol to this phase before inviting anyone. If it is redirect, assign each change to its
  owning phase and define the repeat condition. If it is stop, record which product assumption
  failed. Complete when no finding is presented as an implemented change.

## Acceptance and verification

The owner pilot is complete only when:

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
plan does not complete the pilot and does not make Phase 5 `Done`.

## Rollout and rollback

The pilot uses the private v0.1.1 GitHub release. No new build or distribution path is needed.
The package writes to the existing `com.konzendi.app` data location and reads compatible
development logs unchanged.

To stop the pilot, quit Konzendi and record the stop reason. Removing the package does not remove
the event log. To return to the pre-pilot data state, first copy the current trial data to a
private location if it must be retained, then restore the pre-pilot backup while Konzendi is
closed. Restoring the backup removes the pilot events from the active data directory but does
not change the saved trial copy.

Do not publish the package or send the event log as part of this phase. A later participant must
receive the same privacy statement and a supported package for that participant's machine.
