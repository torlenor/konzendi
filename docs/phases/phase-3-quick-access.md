# Phase 3 — Quick access: global shortcut and tray

[Roadmap](../ROADMAP.md#delivery-phases) · prev: [Phase 2](phase-2-tracking-implementation.md) · next: [Phase 4](phase-4-timeline-analytics.md)

**Depends on:** [Phase 2](phase-2-tracking-implementation.md)  
**Effort:** M  
**Complexity:** M  
**Readiness:** Discovery required

> **Placeholder.** This document records the intended slice and its dependencies only. Its
> scope, work packages, and acceptance checks are written once Phase 1 has fixed the surface
> boundary and Phase 2 exists; the estimates above are provisional. Do not implement against
> this outline.

## Investigation gate

- Does a global shortcut register reliably on the target desktop (Linux, X11, Cinnamon), and
  what happens under Wayland? Phase 0 recorded that the Tauri documentation lists Linux as
  supported without distinguishing the two; that is unverified here.
- How does the quick surface appear and dismiss without stealing the working window's focus for
  longer than the interaction takes?
- Which actions it must offer is decided by Phase 1's surface boundary, not here.
- Is the shortcut configurable, and what happens when the chosen combination is already taken?

## Outcome and scope

Logging a switch without leaving the current application: a global shortcut opening a quick
switcher, and a tray control as a second entry point. This is the remedy Phase 0 named for the
central product risk, so it exists before any trial that measures logging friction.

Out of scope: new tracking behavior beyond what Phase 2 implements, analytics, and packaging.

## Decisions and evidence

None recorded. Phase 0 verified that `libayatana-appindicator3-dev` and `libxdo-dev` are
present on the development machine; nothing about shortcut behavior has been tested.

## Work packages

Not written yet.

## Acceptance and verification

To be written. It must include a check performed with another application focused, since that
is the situation the feature exists for.

## Rollout and rollback

Local delivery; nothing is published. Rollback is removing the shortcut and tray registration,
leaving the window from Phase 2 as the only surface. No data compatibility concern: this phase
adds an entry point to existing events, not a new record shape.
