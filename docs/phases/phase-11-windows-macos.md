# Phase 11 — Windows and macOS trial support

[Roadmap](../ROADMAP.md#delivery-phases) · prev: [Phase 10](phase-10-encrypted-sync.md) · next: [Phase 12](phase-12-logo-design.md)

**Depends on:** [Phase 7](phase-7-releases-ci-cd.md)  
**Effort:** H  
**Complexity:** H  
**Readiness:** Implementation-ready

## Investigation gate

The owner selected the first non-Linux trial matrix on 14 September 2026. It contains Windows
11 x64 and macOS 15 on Apple silicon. Both packages are unsigned prototype packages in the
GitHub release. Trial users accept the operating-system warning and use the documented
override. The packages become public experimental artifacts with the public repository. Public
availability does not make them supported packages or replace the pending native walkthroughs.

The selected matrix is the smallest matrix that gives one current target for each operating
system and that GitHub-hosted native runners can build. GitHub documents `windows-2025` as an
x64 runner and `macos-15` as an Apple-silicon runner in its
[hosted-runner reference](https://docs.github.com/en/actions/reference/runners/github-hosted-runners).
Tauri builds NSIS on Windows and DMG on macOS. It does not use cross-compilation for these
packages.

Apple states that an unsigned application needs a manual **Open Anyway** action in **Privacy &
Security**. Windows can run an unsigned application, but a browser download can show a
SmartScreen warning. These warnings are an accepted trial limitation, not a support defect.
Signing and notarization need separate owner decisions and credentials before wider
distribution.

The **Open Anyway** action is only available if the bundle has a valid signature. The 0.3.0
DMG had no bundle signature: it had only the ad-hoc signature that the linker puts on the
executable, and thus no sealed resources. macOS did not offer **Open Anyway** for it. It told
the user that Konzendi is damaged and must go to the Trash. The macOS bundle therefore gets an
ad-hoc signature (`bundle.macOS.signingIdentity` is `-`). An ad-hoc signature needs no
certificate and identifies no developer. It only makes the bundle valid, which keeps the
manual approval available. The macOS package smoke test sets the quarantine flag on the
installed copy and refuses a bundle that fails `codesign --verify --deep --strict`.

See [Apple's Gatekeeper instructions](https://support.apple.com/en-euro/guide/mac-help/mh40616/mac)
and [Tauri's Windows signing guide](https://v2.tauri.app/distribute/sign/windows/).

## Outcome and scope

This phase adds versioned experimental builds for:

| Trial target | Architecture | Package | Native build runner | Installation |
| --- | --- | --- | --- | --- |
| Windows 11 | x64 | NSIS `.exe` | `windows-2025` | Current user, no administrator access |
| macOS 15 | Apple silicon | `.dmg` | `macos-15` | Copy `Konzendi.app` to Applications |

The Linux x86_64 Debian package remains supported and unchanged. The three packages come from
one reviewed tag and one release workflow run. `SHA256SUMS` covers every package, the manifest,
and the third-party notices. The release stays a draft until the maintainer reviews it. After
publication in the public repository, the release and all assets are public.

The phase includes desktop behavior, packaging, CI builds, installed-package checks,
documentation, withdrawal, and data recovery. It does not include Intel macOS, Windows on ARM,
Windows 10, older macOS versions, app stores, signing, notarization, payments, automatic
updates, or synchronization.

## Decisions and evidence

### Desktop behavior

The official Tauri global-shortcut plugin lists Linux, Windows, and macOS as supported
platforms. Konzendi now enables its shortcut on Windows and macOS and keeps the Linux X11 gate.
Linux/Wayland remains unsupported. Source inspection also found platform-neutral Tauri calls
for the tray, close-to-tray, window show/hide, focus, resize, and local paths.

Linux has an X11-specific focus-restoration helper. Windows and macOS use the native window
focus request. Hiding the quick switcher does not make a platform-specific request to restore
the previously focused external application. The native walkthrough must record whether each
operating system restores it without such a request. A failure blocks the support claim and
requires a platform-specific implementation or an explicit degraded-mode decision.

The custom frame remains the default. The native-frame setting is the recovery path if the
custom window controls or resize edges fail on a selected target. The walkthrough tests both
settings.

### Storage and compatibility

The bundle identifier stays `com.konzendi.app`; there is no data migration. Tauri resolves the
application data directory from that identifier:

- Windows: `%APPDATA%\com.konzendi.app`
- macOS: `~/Library/Application Support/com.konzendi.app`
- Linux: `$XDG_DATA_HOME/com.konzendi.app`, or `~/.local/share/com.konzendi.app`

Each target uses the same `device.json`, `events/*.jsonl`, and `store.lock` layout. Event files
can move between these directories unchanged. Windows cannot open a directory through
`std::fs::File`, so it keeps the durable file flushes but skips the Unix directory-handle flush.
The native restart and abrupt-stop checks must verify identity and complete JSONL records.
Tauri warns that an identifier ending in `.app` resembles the macOS application-bundle suffix.
The owner keeps it in this phase so Linux and cross-platform event-store paths use one identity.
The warning does not establish that the DMG works; the native build and walkthrough must verify
it before the macOS trial starts.

### Release matrix

The release workflow keeps Phase 7's tag validation, owner checks, exact commit, manual draft
publication, failure injection, and conflict refusal. The reusable CI workflow builds all three
packages from the explicit commit. It then creates these six release assets:

- `konzendi_VERSION_amd64.deb`
- `Konzendi_VERSION_x64-setup.exe`
- `Konzendi_VERSION_aarch64.dmg`
- `SHA256SUMS`
- `release-manifest.json`
- `THIRD_PARTY_NOTICES.md`

The manifest records each target, format, signing state, byte size, and SHA-256 hash. A missing
or conflicting platform package stops draft completion. A failing platform job blocks the
combined artifact and the draft job. A rerun uses the same tag and commit.

Hosted package smoke checks use a disposable Windows runner profile and an isolated macOS home
directory. They install, start, stop, restart, and remove the packages. They verify that the
device identity survives restart and that removal keeps user data. Hosted runners do not
provide the interactive evidence needed for shortcut, tray, focus, or warning-dialog claims.

## Work packages

- [x] **Remove source portability blocks.** Report Windows and macOS shortcut backends, keep
      the Wayland refusal, and avoid opening directories as files on Windows. Add unit coverage
      for the platform gate.
- [x] **Configure native packages.** Add per-platform Tauri configuration for a current-user
      Windows NSIS package and a macOS 15 Apple-silicon DMG. Keep the common identifier and the
      Linux Debian configuration.
- [x] **Extend CI and release assembly.** Build all three native packages from the selected
      commit. Run isolated package lifecycle probes. Create one checked asset set and require
      all packages before the draft can become ready.
- [x] **Document trial operation and recovery.** Document installation warnings, paths,
      backups, downgrade limits, per-platform removal, artifact review, and support boundaries.
- [x] **Verify hosted native builds.** Run CI for the implementation commit. Record the runner
      images, package hashes, smoke evidence, and result below. Fix build or lifecycle failures
      before trial distribution.
- [ ] **Complete installed-application walkthroughs.** Use a Windows 11 x64 machine and a
      macOS 15 Apple-silicon machine. Complete every manual check below with synthetic data.
      Record the exact OS version, hardware, package hash, result, and defects.
- [ ] **Rehearse the combined draft.** Push a new release tag only with owner approval. Verify
      all six assets, failure and retry behavior, selective withdrawal, and manual publication.

## Acceptance and verification

Automated checks for each selected native package:

1. Build on the named native runner from the exact selected commit.
2. Install without administrator access.
3. Start the installed application and create its store in an isolated data directory.
4. Stop and restart it; confirm that `device.json` is unchanged.
5. Remove the installed application; confirm that its data remains.
6. Upload the normalized package only after these checks pass.

Perform this installed-application walkthrough on each declared trial target:

1. Verify the package hash, back up any existing data, and follow the documented unsigned-app
   warning procedure. Record the warning that the operating system shows.
2. Start with synthetic data. Verify both windows, the default custom frame, the native-frame
   recovery setting, minimize, maximize, resizing, close-to-tray, and **Quit Konzendi**.
3. Register **Ctrl+Alt+K**. Open the quick switcher from another application, use a topic key,
   Stop, Undo, `K`, Escape, repeated toggles, and a conflicting shortcut. Verify focus on open
   and focus restoration after every dismissal path.
4. Verify every tray action and its disabled states. Verify that the icon remains usable with
   the system light and dark appearances.
5. Record a topic switch while offline. Restart and confirm the state and unchanged device
   identity. Confirm that the process makes no application network request.
6. Upgrade from the previous package, then install the previous version again after a backup.
   Confirm the documented data-compatibility limits and recovery path.
7. Remove the application. Confirm that the event store remains and that reinstalling reads it.

Phase 11 is complete only when the root checks, Rust checks, three hosted package jobs, combined
release assembly, and both native walkthroughs pass. Record the evidence here and only then set
the roadmap status to `Done`.

### Recorded evidence

- 14 September 2026, local source and documentation checks on Linux:
  `npm run typecheck`, `npm run lint`, `npm test` (60 tests), `npm run test:scripts`,
  `npm run build`, `cargo fmt --check`, `cargo clippy --locked -- -D warnings`, and
  `cargo test --locked` (5 tests) passed. The release tests include staged native provenance,
  six-asset checksum coverage, draft retry, conflicts, and exact-source checks.
- 14 September 2026, local config probes: locked debug builds with the base configuration and
  with each Windows and macOS configuration override passed. These probes validate merged
  configuration and Linux compilation only. They are not native package builds.
- 14 September 2026, documentation check: 31 Markdown files had valid local link targets. Phase
  dependency metadata and the Phase 10 → 11 → 12 navigation chain matched the roadmap.
- 18 September 2026, release workflow run `35338608210` for commit
  `8dcfc98f356944c3f132e45af94bc50158263531`: Windows, macOS, Linux, frontend, Rust, combined
  assets, and draft-release jobs passed. The published `v0.2.0` prerelease contains all six
  assets. The runner images were `ubuntu24` `20260907.300.1`, `win25-vs2026`
  `20260907.229.1`, and `macos15` `20260907.0337.1`. The Linux, Windows, and macOS package
  SHA-256 values were `a752d98188653e10c36ed22936b1b2312570546115eb820093b2faeb7120a43a`,
  `21812e39e3dcd99f946a1018b487793e0be1d20dacb9cd40ab0696bcf9c7706c`, and
  `45e6fbb1b62a6ffd2ccb447c9b0013a35ac8561356bb14772c2c256f088e8122`. This is hosted
  lifecycle evidence, not a native interactive walkthrough.
- Windows 11 x64 installed-application walkthrough: the numbered steps are not recorded yet.
  See the owner report of 20 September 2026.
- 15 September 2026, owner Windows trial: the installed application reported that `Store` was
  not managed when `read_events` ran. The screen was empty after each restart. The cause was a
  startup race between the webview command and setup-time state registration. The fix registers
  a lazy store holder on the Tauri builder before webview creation. Native retest is pending.
- 15 September 2026, local Linux regression check: the standalone debug application used an
  isolated data directory on Xvfb. It created two synthetic events and read them after restart.
  This check does not replace the Windows native retest.
- macOS 15 Apple-silicon installed-application walkthrough: the numbered steps are not
  recorded yet. See the owner report of 20 September 2026.
- 18 September 2026, the combined `v0.2.0` draft was created by the successful release run and
  published after review. The fault-injection and selective-withdrawal rehearsal is still
  pending, so the combined-draft work package remains open.
- 20 September 2026, owner report: all features operate correctly in the installed Windows and
  macOS builds. The report does not give the operating-system versions, the hardware, the
  package hashes, or the result of each numbered walkthrough step. The two walkthroughs
  therefore remain open, although no feature defect is known.
- 20 September 2026, macOS 15 Apple silicon: the published 0.3.0 DMG did not start. macOS
  reported that Konzendi is damaged and must go to the Trash, because the bundle had only the
  ad-hoc signature that the linker puts on the executable and thus no sealed resources.
  `codesign --verify --deep --strict` refused that bundle. The application started after a
  manual `codesign --force --deep --sign -` and removal of the quarantine flag. The macOS
  bundle now gets an ad-hoc signature during the build, and the macOS package smoke test
  refuses a bundle that fails the same examination. A package that is built with this
  configuration still needs native verification.

## Rollout and rollback

Publish Windows and macOS artifacts only as unsigned experimental packages until their matching
native walkthroughs pass. Give each tester the package hash, unsigned-package warning, backup
path, removal steps, and support boundary. Do not claim platform support before the walkthrough
passes. Do not publish a partial multi-platform draft.

If one trial target fails before publication, keep the draft incomplete or remove the whole
incomplete draft and rerun the same tag after a transient failure. Source defects require a new
commit, version, and tag. Never move a pushed tag. If a published platform package is unsafe,
edit the release warning immediately and withdraw the release assets. Keep the tag.

Rollback closes Konzendi, backs up the current platform data directory, installs the previous
package, and restores the backup only if the release notes permit the older event vocabulary.
Removing an NSIS installation or `Konzendi.app` must not remove the event store. Linux rollback
and its event log remain unchanged.
