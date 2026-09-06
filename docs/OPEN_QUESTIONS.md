# Open questions

Track questions and their decisions here, retaining resolved rows for reference. Proposals in the
[concept discussion](brainstorming/context-switching-app-concept.md) are inputs, not defaults.
When a decision is made, record it and its rationale in the relevant phase document, update
its status and outcome here, and update affected plans. Summarize the outcome briefly and link
to the decision details. A proposed option is not an accepted decision.

Question status is one of `Open`, `Investigating`, `Resolved`, or `Deferred`. For deferred
questions, record why and when to revisit them in the outcome. These describe questions;
phase status remains exclusively in the roadmap. Related phases are optional: use `—` when
none has been assigned, and link to existing phase documents when applicable.

| ID | Decision needed | When needed | Current input | Status | Outcome | Related phases |
| --- | --- | --- | --- | --- | --- | --- |
| Q01 | Is Konzendi the public product name? | Before public branding or package identifiers | Workspace name only; concept leaves naming open. | Open | — | [Phase 0](phases/phase-0-repo-setup.md) |
| Q02 | Is the first deliverable a validation prototype or a usable product, and what is its smallest scope? | Before application scaffolding | Topics, switching, pauses, correction, and a timeline are proposed. | Open | — | [Phase 0](phases/phase-0-repo-setup.md) |
| Q03 | Which delivery form and initial operating systems/browsers should be supported? | Before stack and tooling selection | Compare browser web app, PWA, Electron desktop, and Tauri desktop. | Open | — | [Phase 0](phases/phase-0-repo-setup.md) |
| Q04 | Should the app be offline-only, local-first with online features, or online with accounts; what stack and tooling follow? | Before application scaffolding; after Q02 and Q03 | Decide accounts, data location, backup, sync, offline behavior, and any backend before choosing storage and development/check commands. | Open | — | [Phase 0](phases/phase-0-repo-setup.md) |
| Q05 | What is the primary logging interaction, and how are pauses, accidental switches, missed entries, and completed work represented? | Before the tracking implementation plan is ready | Buttons, shortcut, tray, undo, and corrections are proposed. | Open | — | — |
| Q06 | How will usefulness and logging friction be evaluated, and what result justifies further development? | Before planning a validation trial | A one-week trial is proposed; participants and success criteria are undecided. | Open | — | — |
| Q07 | Should the first scope include a score or effort levels? If so, what do they mean and how are they explained and tested? | Before score or effort implementation | No formula or validated interpretation exists. | Open | — | — |
| Q08 | Which analytics are useful enough to include initially? | Before the first analytics implementation plan | Timeline, uninterrupted intervals, switch rates, and trends are candidates. | Open | — | — |
| Q09 | Should the product be commercial, and what are the free/paid boundary, price, and update entitlement? | Before commercial implementation | One-time Pro purchase is a proposal. | Open | — | — |
| Q10 | Which distribution and payment channels, device limits, and offline entitlement rules should apply? | Before release or licensing implementation | Direct licensing and an app store are alternatives, dependent on platform and Q09. | Open | — | — |

Only decisions needed by the next work should block it. Commercial decisions need not delay
an initial tracking experiment unless the chosen scope depends on them.
