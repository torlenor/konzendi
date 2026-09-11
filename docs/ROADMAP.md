# Roadmap

**Last updated:** 11 September 2026

## Vision

A simple, robust tool for people working on a computer, especially developers and engineers,
to understand context switching and develop more fulfilling, sustainable working habits.
This is the intended benefit, not a demonstrated health or productivity outcome.

## Delivery phases

This table is the single phase index and sole source of phase status. Phase documents own the
implementation details and declare `Depends on`, `Readiness`, `Effort`, and `Complexity`.
Their checkboxes track individual work items only.

| Phase | Focus | Delivers | Depends on | Status |
| --- | --- | --- | --- | --- |
| **0** | [Repository setup](phases/phase-0-repo-setup.md) | Consistent working rules, documentation, and the local-first Tauri foundation with a verified event round-trip | None | Done |
| **1** | [Tracking experience design](phases/phase-1-tracking-design.md) | A specification of the tracking interaction: model, event vocabulary, undo and correction rules, screen design | 0 | Done |
| **2** | [Topic tracking implementation](phases/phase-2-tracking-implementation.md) | The tracking loop: topics, switching, pauses, undo, and correction, persisted as events | 0, 1 | Done |
| **3** | [Quick access](phases/phase-3-quick-access.md) | Global shortcut and tray entry points for logging without leaving the current application | 2 | Done |
| **4** | [Timeline and first analytics](phases/phase-4-timeline-analytics.md) | A timeline of topics and pauses, plus the smallest useful analytics | 2 | Not started |
| **5** | [Validation trial](phases/phase-5-validation-trial.md) | A recorded answer to whether switches get logged and whether the result is useful | 3, 4 | Not started |
| **6** | [Application theme](phases/phase-6-application-theme.md) | A deliberate visual theme for the application, expressed as a documented token set | 2 | Done |
| **7** | [Releases and CI/CD](phases/phase-7-releases-ci-cd.md) | Local version/changelog helpers and tag-triggered private Linux release builds, with checksums, manual draft publication, and recovery | 2 | Not started |
| **8** | [Application window frame](phases/phase-8-window-frame.md) | The application's own title bar and window edge, absorbing the header and carrying the window commands, with a fallback to the desktop's decorations | 3, 6 | Not started |
| **9** | [Quick access: open window](phases/phase-9-quick-access-open-window.md) | A `K` command in the quick switcher that opens the Konzendi tracking window | 3 | Not started |

A phase becomes `Done` only when its acceptance criteria are verified.
