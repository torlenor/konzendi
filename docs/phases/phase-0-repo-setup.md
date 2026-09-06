# Phase 0 — Repository setup

[Roadmap](../ROADMAP.md#delivery-phases) · prev: none · next: none

**Depends on:** None  
**Effort:** L  
**Complexity:** L  
**Readiness:** Discovery required

## Investigation gate

Before application scaffolding, resolve [Q02–Q04](../OPEN_QUESTIONS.md): the first deliverable,
delivery form, connectivity/account model, and repository tooling. Resolve Q01 before choosing
public package identifiers.

Answer these questions explicitly:

- **Delivery form:** browser web app, installable PWA, dedicated Electron desktop app, or
  dedicated Tauri desktop app? Which operating systems and browsers are initial targets?
- **Connectivity:** offline-only, local-first with optional online features, or an online
  service? Which functions must work without a connection?
- **Identity and data:** are accounts needed, optional, or absent? Is data kept on one device,
  backed up online, or synchronized between devices? What are the resulting authentication,
  storage, export/deletion, and sync-conflict requirements?
- **Repository foundation:** given those decisions, what frontend, desktop wrapper, backend
  (if any), storage, tooling, and automated checks are actually needed?

Gather the user's intended initial use case and operating systems and inspect the actual
workspace. Compare all four delivery candidates against logging friction (including shortcut
and tray needs), offline support, data durability, installation/update effort, and maintenance.
Compare connectivity/account options against user value, privacy, recovery, and operating cost.
Use current primary documentation for capability claims; identify uncertainty and specify a
bounded capability experiment only where evidence is insufficient.

Record the comparison, the user's accepted choices, rejected alternatives, and rationale here.
The gate is satisfied when delivery form, initial targets, offline behavior, accounts, data
location, and any backend/sync scope are explicit, with no unresolved decision that prevents
scaffolding. Then specify exact scaffolding files, commands, and verification steps and change
readiness to `Implementation-ready` before writing production code.

## Outcome and scope

Establish working rules, navigable planning documents, and the minimum development foundation
required by the selected first deliverable. Documentation preparation can proceed during discovery.

Tracking features, analytics, scoring, payments, and release distribution are outside this phase.
Choosing the delivery form and connectivity/account architecture is part of discovery; building
account flows, cloud services, or synchronization is not authorized by that choice alone.
Do not scaffold an application merely to fill the currently empty repository.

## Decisions and evidence

- The workspace contains planning documentation and no application source or build configuration.
- The existing concept preserves recommendations; it does not select an implementation stack.
- Application setup choices remain open and must be recorded here after a decision.

## Work packages

- [ ] Align AGENTS.md, the roadmap, open questions, and the phase template; verify local links,
  metadata, and navigation. Add a README that accurately describes the current workspace.
- [ ] Resolve the investigation gate and record the selected setup and its rationale.
- [ ] Replace this provisional setup item with exact files and development/check commands for
  the selected stack, then implement that foundation after readiness changes.
- [ ] Update the repository layout and commands in the documentation and verify that a fresh
  checkout can follow them.

## Acceptance and verification

- All local documentation links resolve, excluding explicit placeholders in the unused template.
- The roadmap alone records phase status; metadata and dependencies match the working rules.
- Open decisions are visible and the concept's proposals are not presented as commitments.
- The selected setup is documented with exact installation, run, and check commands.
- Those commands succeed for the chosen foundation, with evidence recorded here. If an
  intentionally documentation-only foundation is chosen, record that decision and adjust scope
  and acceptance explicitly before completion.

Verification evidence will be recorded as work is completed; none is claimed by this plan.

## Rollout and rollback

Documentation changes are reviewed locally. Once setup is selected, add its concrete delivery
and rollback steps here before implementation. Preserve unrelated files and existing user work.
