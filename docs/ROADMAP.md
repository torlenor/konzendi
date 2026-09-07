# Roadmap

**Last updated:** 6 September 2026

## Vision

A simple, robust tool for people working on a computer, especially developers and engineers,
to understand context switching and develop more fulfilling, sustainable working habits.
This is the intended benefit, not a demonstrated health or productivity outcome.

## Planning boundary

The target audience is established. Manual topic tracking, pauses, and corrections are now
specified in [Phase 1](phases/phase-1-tracking-design.md#decisions-and-evidence). The timeline
and analytics remain proposals in the
[concept discussion](brainstorming/context-switching-app-concept.md).

The first deliverable is a validation prototype: an offline-only Tauri desktop application on
Linux with local, per-device event data and no accounts. Delivery form, initial target,
offline behavior, and data architecture are decided and recorded in
[Phase 0](phases/phase-0-repo-setup.md#decisions-and-evidence), and the tracking interaction is
decided and recorded in [Phase 1](phases/phase-1-tracking-design.md#decisions-and-evidence).
The analytics scope, scoring, synchronization mechanism, and commercial model remain undecided.
See [open questions](OPEN_QUESTIONS.md) for decision timing.

Prepare the repository foundation first, then design the tracking interaction before
implementing it. Later phases are outlined so the intended path is visible, and each is filled
in only when its scope can be stated without treating brainstorming recommendations as
commitments. No product trial, licensing integration, or release is scheduled by this roadmap.

## Delivery phases

This table is the single phase index and sole source of phase status. Phase documents own the
implementation details and declare `Depends on`, `Readiness`, `Effort`, and `Complexity`.
Their checkboxes track individual work items only.

| Phase | Focus | Delivers | Depends on | Status |
| --- | --- | --- | --- | --- |
| **0** | [Repository setup](phases/phase-0-repo-setup.md) | Consistent working rules, documentation, and the local-first Tauri foundation with a verified event round-trip | None | Done |
| **1** | [Tracking experience design](phases/phase-1-tracking-design.md) | A specification of the tracking interaction: model, event vocabulary, undo and correction rules, screen design | 0 | Done |
| **2** | [Topic tracking implementation](phases/phase-2-tracking-implementation.md) | The tracking loop: topics, switching, pauses, undo, and correction, persisted as events | 0, 1 | Not started |
| **3** | [Quick access](phases/phase-3-quick-access.md) | Global shortcut and tray entry points for logging without leaving the current application | 2 | Not started |
| **4** | [Timeline and first analytics](phases/phase-4-timeline-analytics.md) | A timeline of topics and pauses, plus the smallest useful analytics | 2 | Not started |
| **5** | [Validation trial](phases/phase-5-validation-trial.md) | A recorded answer to whether switches get logged and whether the result is useful | 3, 4 | Not started |

Phase 1 designed the tracking interaction and added no application code; its specification is
what Phase 2 implements, and it also supplies Phase 2's acceptance checks. Phases 2 to 5 are
placeholder documents: they record the intended slice, its dependencies, and what must be investigated,
and their scope, work packages, and estimates are written when the phase before them has
delivered. Every one of them is `Discovery required` and none may be implemented as it stands.

Phases 3 and 4 depend only on Phase 2 and may run in parallel. Previous/next links provide
reading order; explicit dependencies determine execution order.

Scoring ([Q07](OPEN_QUESTIONS.md)), synchronization ([Q11](OPEN_QUESTIONS.md)), and the
commercial questions ([Q09, Q10](OPEN_QUESTIONS.md)) have no phase. They are planned only if
Phase 5 shows the tracking habit holds.

A phase becomes `Done` only when its acceptance criteria are verified. Phase 0's foundation,
checks, desktop event round-trip, restart persistence, and standalone offline behavior have
passed; see its [verification evidence](phases/phase-0-repo-setup.md#acceptance-and-verification).
Phase 1's deliverable is a document, and its checks are recorded in its
[verification section](phases/phase-1-tracking-design.md#acceptance-and-verification).
Together these establish a repository foundation and a recorded design, not a working tracking
product.
