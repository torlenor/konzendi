# Roadmap

**Last updated:** 14 September 2026

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
| **4** | [Timeline and first analytics](phases/phase-4-timeline-analytics.md) | A day timeline of topics, plus the smallest useful readings | 2 | Done |
| **5** | [Validation trial](phases/phase-5-validation-trial.md) | A recorded answer to whether switches get logged and whether the result is useful | 3, 4 | In progress |
| **6** | [Application theme](phases/phase-6-application-theme.md) | A deliberate visual theme for the application, expressed as a documented token set | 2 | Done |
| **7** | [Releases and CI/CD](phases/phase-7-releases-ci-cd.md) | Local version/changelog helpers and tag-triggered private Linux release builds, with checksums, manual draft publication, and recovery | 2 | Done |
| **8** | [Application window frame](phases/phase-8-window-frame.md) | The application's own title bar and window edge, absorbing the header and carrying the window commands, with a fallback to the desktop's decorations | 3, 6 | Done |
| **9** | [Quick access: open window](phases/phase-9-quick-access-open-window.md) | A `K` command in the quick switcher that opens the Konzendi tracking window | 3 | In progress |
| **10** | [Server-supported encrypted sync](phases/phase-10-encrypted-sync.md) | Opt-in, local-first multi-device sync in which the service stores opaque client-encrypted tracking data | 2 | Not started |
| **11** | [Windows and macOS trial support](phases/phase-11-windows-macos.md) | Private Windows 11 x64 and macOS 15 Apple-silicon trial builds, without weakening Linux support | 7 | In progress |
| **12** | [Logo design](phases/phase-12-logo-design.md) | A documented, accessible Konzendi logo system for the tray, application icons, favicon, and README | 6 | Done |
| **13** | [Stop replaces pause](phases/phase-13-stop-replaces-pause.md) | One state for not working, named Stop on every surface, and analytics that measure topics only | 2, 4 | Done |
| **14** | [Further statistics](phases/phase-14-further-statistics.md) | The second set of readings, chosen against real logged data | 4, 5 | Not started |
| **15** | [Stable topic numbering](phases/phase-15-stable-topic-numbering.md) | One numbering in both surfaces: the window lists every topic, marking the running one | 2, 3 | Done |
| **16** | [Stable topic quick keys and topic colours](phases/phase-16-topic-quick-keys.md) | Optional topic keys 1–9 shared by both views, compact sparse assignments, access to unassigned topics, and an optional topic colour shown on every topic surface | 2, 3 | Not started |
| **17** | [Storage location in an overflow menu](phases/phase-17-storage-location-menu.md) | A `…` menu in the bar that opens the data directory in the file manager, and holds the appearance override and About | 0, 6 | Not started |
| **18** | [Window content that fits the window](phases/phase-18-window-content-fit.md) | Window content that adapts to the window size: the title bar and controls stay visible, and no content is cut off without a way to reach it | 8 | Done |
| **19** | [A scrollbar that is always visible](phases/phase-19-visible-scrollbar.md) | A theme-styled scrollbar on the tracking window's content area that stays visible, so a view that continues below the window shows it | 6, 18 | Not started |

Phase 16 can proceed independently of Phases 5 and 14. Navigation order does not imply a dependency.

A phase becomes `Done` only when its acceptance criteria are verified.
