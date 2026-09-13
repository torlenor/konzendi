# Phase 11 — Windows and macOS trial support

[Roadmap](../ROADMAP.md#delivery-phases) · prev: [Phase 10](phase-10-encrypted-sync.md) · next: [Phase 12](phase-12-logo-design.md)

**Depends on:** [Phase 7](phase-7-releases-ci-cd.md)  
**Effort:** H  
**Complexity:** H  
**Readiness:** Discovery required

## Investigation gate

The owner decided on 11 September 2026 that Windows and macOS support is worth investigating so
other people can try Konzendi, but only after the Linux release pipeline in Phase 7 is
implemented. This records the sequence; it does not yet select operating-system versions,
architectures, package formats, signing policy, or distribution channels.

Before writing production platform support, gather evidence and record decisions for:

1. Which supported Windows and macOS versions and architectures match the intended trial group.
2. Whether global shortcuts, quick-switcher focus and focus restoration, the tray, close-to-tray,
   startup, and both application windows behave acceptably on each candidate target.
3. Which native package formats, code-signing and notarization policies, publisher identities,
   certificates, accounts, costs, and private download path are required for people to install
   the application without unsafe workarounds.
4. Whether Phase 7's version, changelog, tag, checksum, manifest, draft-release, retry, and
   recovery contracts can be extended as a native build matrix without allowing one platform to
   publish artifacts from a different source revision.
5. How the current bundle identifier and application-data paths behave on both platforms, and
   how existing Linux data remains compatible if identity or storage conventions change.
6. Which real or virtual machines can exercise installation, launch, offline tracking, restart
   persistence, upgrade, downgrade, removal, and failure recovery on every claimed target.

Discovery may narrow the first expansion to one operating system or architecture. Record that
outcome here, update the roadmap delivery text if needed, and change readiness only when the
selected support contract and work packages are decision-complete.

## Outcome and scope

The eventual outcome is private, versioned trial builds for the selected Windows and macOS
targets, produced from the same reviewed tag as the Linux package and verified on their declared
systems. The existing Linux/X11 release must remain available and its acceptance checks must
continue to pass.

This phase includes native desktop behavior, packaging, signing or an explicitly accepted
private-trial alternative, CI build hosts, platform-specific acceptance checks, documentation,
and release recovery. It does not choose app stores, payments, entitlement, automatic updates,
sync, or public redistribution policy. It does not claim that unselected operating-system
versions, architectures, compatibility layers, or Linux/Wayland are supported.

## Decisions and evidence

The sequence is accepted: implement and verify Phase 7 before beginning this phase's platform
work. Reusing its release contract gives non-Linux builds an established source-tag, version,
artifact-integrity, publication, and recovery model rather than creating a second release
process first.

Everything beyond that sequence remains undecided. Tauri configuration, cross-platform-looking
dependencies, icons, or a successful compilation do not establish support. Each claim needs a
native build and an installed-application walkthrough on the exact operating-system and
architecture combination named in the support contract.

## Work packages

- [ ] **Identify trial targets and constraints.** Inventory the intended testers' operating
      systems and architectures, available build/test machines, developer accounts, certificate
      requirements, and acceptable installation friction. Complete when the owner selects the
      smallest useful target matrix and records excluded combinations with rationale.
- [ ] **Audit platform seams.** Trace compile guards and every window, shortcut, focus, tray,
      lifecycle, path, identifier, and storage assumption through the frontend and Rust shell.
      Run disposable native spikes where source inspection is insufficient. Complete when every
      Linux-specific behavior has a selected native equivalent, an intentional degraded mode,
      or a recorded reason to exclude the target.
- [ ] **Design the release-matrix extension.** Specify native runners, pinned toolchains,
      packages, signing/notarization, artifact names, checksums, manifests, permissions, and
      tag-to-draft handoff while preserving Phase 7's exact-source and manual-publication rules.
      Complete when failure and retry behavior cannot mix artifacts across commits or versions.
- [ ] **Define native acceptance and recovery.** Specify per-target installation, first launch,
      shortcut/tray interaction, offline tracking, restart persistence, upgrade, downgrade,
      backup, removal, and rollback checks using synthetic data. Complete when each supported
      combination has an owned environment and observable pass/fail criteria.
- [ ] Replace this discovery outline with decision-complete implementation work packages,
      acceptance checks, rollout, and rollback; update readiness without changing roadmap status
      merely because planning completed.

## Acceptance and verification

The phase has no platform-support claim yet. Before changing readiness to
`Implementation-ready`, this document must contain:

- an owner-approved operating-system and architecture matrix;
- recorded shortcut, focus, tray, window, lifecycle, and storage behavior on native systems;
- selected package, signing/notarization, identity, and private-distribution policies;
- a Phase 7-compatible native build, artifact, publication, retry, and recovery design;
- owned native test environments and decision-complete automated and manual checks; and
- explicit rollout, rollback, data-compatibility, and support-boundary language.

The eventual implementation is complete only when every claimed package is built from one
reviewed tag, installs on its named target, passes its native desktop and offline-persistence
checks, and can be withdrawn or rolled back without changing the Linux user's event log.

## Rollout and rollback

No Windows or macOS rollout is authorized while this document requires discovery. Spikes use
synthetic event logs and private, disposable artifacts; they must not be presented as supported
downloads.

The eventual rollout begins with a private draft release and a small trial group on the smallest
accepted target matrix. Linux artifacts remain unchanged. A failing platform build must not
block withdrawal of only that platform's unpublished artifact, and rollback must preserve the
same append-only event data or document and test an explicit backward-compatible migration.
