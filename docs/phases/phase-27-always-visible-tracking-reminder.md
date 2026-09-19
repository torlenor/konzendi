# Phase 27 — Always-visible tracking reminder

[Roadmap](../ROADMAP.md#delivery-phases) · prev: [Phase 26](phase-26-fine-grained-time-correction.md) · next: none

**Depends on:** [Phase 2](phase-2-tracking-implementation.md), [Phase 6](phase-6-application-theme.md), [Phase 8](phase-8-window-frame.md)  
**Effort:** M  
**Complexity:** M  
**Readiness:** Discovery required

> **Discovery first.** The trial identified forgotten tracking, not a proven reminder design.
> Investigate the reminder and its cost before writing production code.

## Investigation gate

The Phase 5 owner trial found that the main window worked well when it stayed visible on a third
screen. Late recordings occurred when a small urgent request, most often through Microsoft
Teams, changed the work but Konzendi did not come to mind for several minutes. The owner proposed
a small floating Konzendi mark or dashboard as a possible reminder.

Answer and record these questions before implementation:

- **What must the reminder accomplish?** Define the observable behavior that makes forgotten
  tracking less likely. Separate a passive reminder from a notification, alarm, or demand to
  switch topics.
- **Which surface is the smallest useful one?** Compare a logo-only indicator, a current-topic
  indicator, and a compact dashboard. Also compare them with keeping the existing main window
  visible. Record whether the surface only reminds, opens Konzendi, or supports tracking actions.
- **When and where is it visible?** Decide always-on-top behavior, supported monitors and
  workspaces, position, movement, stored position, full-screen behavior, and what happens after a
  display is disconnected. Investigate Linux/X11 behavior first. Do not assume that Windows and
  macOS window managers behave the same way.
- **How does the user control it?** Define how to show, hide, move, and restore the surface. It
  must be optional and must not trap pointer or keyboard input.
- **What can it reveal?** Decide whether it shows a topic name, elapsed time, color, or only the
  Konzendi mark. Include screen sharing, shoulder visibility, screenshots, and a neutral hidden
  state in the privacy review.
- **Does it become distracting?** Define a bounded owner experiment that records whether the
  reminder was noticed at real switches, whether late corrections decreased, whether it covered
  work, and whether the owner hid or ignored it. Do not claim a productivity effect.
- **What desktop implementation is reliable?** Prototype only what is necessary to verify window
  capabilities, focus behavior, application shutdown, startup restoration, multiple displays,
  and interaction with the main and quick-access windows. Record platform limits before choosing
  the production design.

The gate closes when the owner selects a design or rejects the reminder, the evidence and
rationale are recorded, and the document has concrete implementation work packages and
acceptance checks. Change readiness to `Implementation-ready` only after that decision.

## Outcome and scope

A decision and, if supported by evidence, an implementation-ready design for an optional,
persistent Konzendi surface that reminds the user what is currently tracked. The design must be
small enough to remain visible during normal work and quiet enough not to create a new
interruption.

The discovery scope includes Linux/X11 window behavior, multi-monitor placement, interaction and
focus rules, privacy, theme and logo use, accessibility, persistence of the user's choice, and a
bounded owner experiment.

Out of scope:

- Microsoft Teams integration or monitoring another application's messages;
- automatic topic detection, application tracking, or activity surveillance;
- notification alarms, forced prompts, or a claim that the reminder improves productivity;
- weekly statistics, achievements, or changes to the event vocabulary;
- enabling the reminder by default before the owner accepts its behavior; and
- promising identical Windows or macOS behavior before native investigation.

## Decisions and evidence

On 19 September 2026, the owner chose to investigate an always-visible reminder. No surface or
implementation is accepted yet. The Phase 5 evidence supports the problem statement:

- the owner used the main window for approximately 70% of switches and found it easiest when it
  remained visible on a third screen;
- quick access covered approximately 30% of switches, while the tray did not come to mind;
- approximately one or two switches per day were recorded several minutes late and corrected;
  and
- small urgent requests were the most common trigger for a late recording.

This evidence does not show that a floating window solves the problem. The existing main window
is the comparison case for discovery.

## Work packages

Production work packages are not written yet. Discovery must first:

- document current window capabilities and platform limits;
- create only the disposable prototypes needed to compare the candidate surfaces;
- review privacy, focus, positioning, and accessibility with the owner;
- run the bounded owner experiment with the accepted candidate; and
- record an accept, revise, or reject decision.

If the owner accepts a production design, replace this list with file-specific work packages,
failure handling, delivery steps, and completion conditions before changing readiness.

## Acceptance and verification

Discovery is complete when the investigation gate has recorded evidence for every question and
the owner has accepted or rejected the reminder. An accepted design must specify observable
behavior for startup, shutdown, show and hide, focus, pointer and keyboard access, window
position, display changes, privacy, theme, and failure recovery. It must also define automated
checks and native desktop walkthroughs.

No production acceptance checks have run. A prototype demonstrates feasibility only; it does
not establish that the reminder is useful or ready to ship.

## Rollout and rollback

Discovery changes documentation and may use disposable local prototypes. Do not distribute a
prototype or open the owner's tracking data during technical checks. Remove disposable windows,
configuration, and test data after the investigation.

Before implementation, define how the user enables and disables the reminder, how window state
remains compatible across versions, and how rollback removes the surface without changing the
event log or other tracking data.
