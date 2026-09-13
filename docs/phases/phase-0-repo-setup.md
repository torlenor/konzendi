# Phase 0 — Repository setup

[Roadmap](../ROADMAP.md#delivery-phases) · prev: none · next: [Phase 1](phase-1-tracking-design.md)

**Depends on:** None  
**Effort:** M  
**Complexity:** L  
**Readiness:** Implementation-ready

## Outcome and scope

Establish working rules, navigable planning documents, and the development foundation for the
selected first deliverable: a local-first Tauri desktop application on Linux, with an
append-only event log owned by Rust and a pure TypeScript domain core.

Phase 0 ends when the scaffolding runs, the checks pass, and a single hardcoded event is
written to the log by Rust and read back into the interface. That round-trip exists to prove
the storage and logic-split decisions before later phases build on them.

Out of scope: topic buttons, switching, pauses, undo, timestamp correction, the timeline,
global shortcut and tray integration, analytics, scoring, accounts, synchronization, payments,
licensing, and release distribution. Choosing the delivery form and data architecture was part
of discovery; building account flows, cloud services, or synchronization is not authorized by
those choices.

## Decisions and evidence

Discovery is complete. The decisions below were made by the user on 6 September 2026.

### Accepted decisions

| Area | Decision |
| --- | --- |
| Product name | Konzendi is the public product name and is used for package and bundle identifiers. |
| First deliverable | A validation prototype: the smallest scope that tests whether switches get logged at all. Its features are planned in a later phase, not here. |
| Delivery form | Tauri v2 desktop application with a React + TypeScript + Vite frontend. |
| Initial target | Linux (X11). macOS and Windows are not initial targets. |
| Connectivity | Offline-only in the prototype. No network call is required for any function. |
| Accounts | None. No authentication, no server, no operating cost. |
| Data location | Local files in the application data directory, owned by the user. |
| Data model | Append-only JSONL event log, one file per device. Every event carries a unique id, an originating device id, and a recorded timestamp. |
| Logic split | Rust owns durability; a pure TypeScript module owns the domain core and analytics. |
| Backup and portability | Manual export and import; the log files are the export format. |
| Checks | Biome, `tsc`, Vitest, `cargo fmt`, `cargo clippy`. |

### Rationale

**Tauri desktop over PWA, plain web app, or Electron.** The central product risk is logging
friction, and the proposed remedy is a global shortcut and tray access. A browser tab cannot
provide either, so a web deliverable would test a different interaction than the one intended.
Electron offers the same capabilities as Tauri with a larger runtime and heavier updates.
The cost accepted is a Rust toolchain and, later, platform packaging.

**Linux only initially.** It is the development machine, giving the shortest build and
dogfooding loop. macOS and Windows each require their own build host or CI and are not
justified before the tracking habit is validated.

**Offline-only, no accounts.** Every function must respond instantly all day; a network
dependency adds failure modes, hosting cost, and a privacy surface for data that has no reason
to leave the machine. Recovery relies on the user's own backups, which is acceptable for a
prototype.

**Sync-ready data model without building sync.** The user works on separate private and work
computers, so multi-device use is expected, and monetization may later require device
identity. Assigning event ids, a device id, and recorded timestamps now costs little and keeps
synchronization additive rather than a migration that discards early tracking history. The
sync mechanism itself stays open and is now handled by
[Phase 10](phase-10-encrypted-sync.md).

**JSONL, one file per device, over SQLite or a JSON snapshot.** Each device appends only to
its own file, so merging several devices is a union of files with no conflict resolution. This
works under any later sync mechanism, including a user-owned folder replicated by external
tooling. A single SQLite file syncs badly across devices, and a rewritten JSON snapshot risks
loss on a crash mid-write. The cost is no query engine; filtering happens in application code,
which the data volume permits.

**Rust owns durability, TypeScript owns interpretation.** Atomic appends and a trustworthy
device identity can only be guaranteed below the webview, and that Rust code is reusable by a
future background sync process. Analytics stay in TypeScript because they will be rewritten
repeatedly during validation, and an IPC hop per chart change is friction where iteration
actually happens. The domain core imports neither React nor Tauri, so it is unit-testable
without a window and portable if a second frontend appears.

**React over Svelte or vanilla TypeScript.** It has the widest charting ecosystem for the
timeline and later analytics. Its overhead is irrelevant inside a desktop shell.

**Biome over ESLint and Prettier.** One tool and one configuration file covering lint and
format, with faster runs. The larger ESLint plugin ecosystem is not needed at this size.

### Rejected alternatives

- Installable PWA and plain browser web app — no global shortcut or tray, and browser-managed
  storage can be evicted. Rejected as the primary deliverable; not re-examined.
- Electron — equivalent capability, larger runtime and update burden.
- Online service with accounts — unusable offline, adds hosting, auth, and privacy surface.
- Local-only with no event or device identity — cheapest now, but adding sync or device limits
  later would require a data migration.
- Building synchronization in Phase 0 — spends the effort before knowing whether switches get
  logged at all, and exceeds this phase's scope.

### Assumptions to confirm

- The bundle identifier is recorded below as `com.konzendi.app`. Confirm it before anything is
  distributed, particularly if a different domain is registered for the product.

### Verified environment evidence

Checked on the development machine on 6 September 2026. All Tauri v2 Linux prerequisites are
already present; no system package installation is required.

| Component | Found | Note |
| --- | --- | --- |
| OS | Linux Mint 22.3 (Ubuntu 24.04 base), X11, Cinnamon | X11 is the favorable case for global shortcuts |
| Node.js / npm | v24.16.0 / 11.13.0 | |
| Rust / Cargo | 1.98.0 / 1.98.0 | Tauri v2 requires at least 1.77.2 |
| C compiler / pkg-config | gcc 13.3.0 / 1.8.1 | |
| webkit2gtk-4.1 | 2.52.6 | |
| javascriptcoregtk-4.1 | 2.52.6 | |
| libsoup-3.0 | 3.4.4 | |
| gtk+-3.0 | 3.24.41 | |
| librsvg-2.0 | 2.58.0 | |
| ayatana-appindicator3-0.1 | 0.5.90 | `libayatana-appindicator3-dev` installed; needed for tray in a later phase |
| libxdo | `/usr/include/xdo.h` present | `libxdo-dev` installed |
| OpenSSL | 3.0.13 | `libssl-dev` installed |

Sources consulted: [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/),
[create a project](https://v2.tauri.app/start/create-project/), and the
[global shortcut plugin](https://v2.tauri.app/plugin/global-shortcut/). The global shortcut
documentation lists Linux as supported but does not distinguish X11 from Wayland; this is
recorded for the later phase that implements the shortcut, and is not a Phase 0 concern.

### Workspace facts

- At discovery, the workspace contained planning documentation and no application source or
  build configuration. The foundation now lives at the repository root; see the README.
- The concept document preserves recommendations; it does not select an implementation stack.

## Work packages

- [x] Align AGENTS.md, the roadmap, open questions, and the phase template; verify local links,
  metadata, and navigation. Add a README that accurately describes the current workspace.
- [x] Resolve the investigation gate and record the selected setup and its rationale.
      Complete: decisions and rationale are recorded above.

- [x] **Scaffold the application at the repository root.** Generate a Tauri v2 project with the
  React + TypeScript template into an empty temporary directory, then move the generated files
  into the repository root. `create-tauri-app` refuses a non-empty target, and the existing
  `README.md`, `CLAUDE.md`, `AGENTS.md`, and `docs/` must not be overwritten.

  ```bash
  npm create tauri-app@latest konzendi -- --template react-ts
  ```

  Resulting layout, added to the existing documentation files:

  ```
  package.json  vite.config.ts  tsconfig.json  index.html  biome.json  .gitignore
  src/                    React interface
  src/core/               pure domain module: no React, no Tauri imports
  src/core/*.test.ts      Vitest tests for the domain core
  src-tauri/              Rust: main.rs, lib.rs, storage.rs, tauri.conf.json, Cargo.toml
  ```

  In `src-tauri/tauri.conf.json` set `productName` to `Konzendi` and `identifier` to
  `com.konzendi.app`. Add `node_modules/`, `dist/`, and `src-tauri/target/` to `.gitignore`.
  Complete when `npm run tauri dev` opens a window and the existing documentation files are
  unchanged.

- [x] **Implement the event store in Rust** (`src-tauri/src/storage.rs`). On first run, generate
  a device id and persist it as `device.json` in the application data directory. Events are
  appended as one JSON object per line to `events/<device-id>.jsonl` in the same directory,
  using an append-mode file handle flushed after each write. Each record:

  ```json
  {"id": "<uuid>", "device": "<device-id>", "recordedAt": "<RFC 3339 UTC>", "kind": "<string>", "payload": {}}
  ```

  Expose two Tauri commands: `append_event(kind, payload)` returning the stored record, and
  `read_events()` returning the records from every `*.jsonl` file in the directory, sorted by
  `recordedAt`. A malformed line is skipped and reported, not fatal. Event kinds beyond the
  placeholder used here belong to the later tracking phase. Complete when both commands are
  registered and `cargo clippy` passes with no warnings.

- [x] **Add the TypeScript domain core** (`src/core/`). Define the event record type mirroring
  the Rust record, a function merging records from several devices into one ordered sequence
  (deduplicating by event id), and its Vitest tests. The module must import neither React nor
  Tauri. Complete when `npm test` passes and no file in `src/core/` imports either.

- [x] **Wire the round-trip.** On a button press the interface calls `append_event` with a
  placeholder kind, then calls `read_events`, passes the result through the domain core, and
  displays the returned records. Complete when a fresh run writes a line to the JSONL file and
  displays it after a restart of the application.

- [x] **Add the check commands** to `package.json`: `typecheck` (`tsc --noEmit`), `lint`
  (`biome check .`), `format` (`biome format --write .`), `test` (`vitest run`). Rust checks
  run through `cargo fmt --check` and `cargo clippy -- -D warnings` in `src-tauri/`. Complete
  when every command runs from a clean checkout after `npm install`.

- [x] **Update the documentation** with the actual layout and verified commands: the repository
  layout sections in `AGENTS.md` and `CLAUDE.md`, and the README's statement that no
  application exists. Complete when a fresh checkout can be set up by following the README
  alone.

## Acceptance and verification

- All local documentation links resolve, excluding explicit placeholders in the unused template.
- The roadmap alone records phase status; metadata and dependencies match the working rules.
- Open decisions are visible and the concept's proposals are not presented as commitments.
- `npm install` succeeds from a clean checkout.
- `npm run tauri dev` opens the application window on Linux.
- `npm run typecheck`, `npm run lint`, `npm test`, `cargo fmt --check`, and
  `cargo clippy -- -D warnings` all pass.
- Pressing the round-trip button appends exactly one line to `events/<device-id>.jsonl`, and
  that record is displayed again after restarting the application.
- No file under `src/core/` imports React or Tauri.
- The application requires no external network request. Development uses the local Vite
  HTTP/WebSocket server; verify the executable with embedded assets separately for offline use.

### Implementation details

- Scaffolded with `create-tauri-app` 4.7.4 in `/tmp`, then copied only new files into the
  repository. Existing documentation and the `CLAUDE.md` symlink were preserved during
  scaffolding. README and AGENTS updates were made deliberately in the documentation package.
- Removed the template opener plugin and demo assets. Only the two storage commands are
  registered; the UI writes `foundation.check` with an empty payload.
- Storage uses an OS file lock across processes, atomic identity publication, and flush plus
  `sync_all` for appends. A truncated tail is preserved and separated before the next append.
  Malformed records (including invalid UTF-8) are reported to stderr with path and line number.
  Corrupt device identity and I/O errors are not silently replaced or treated as empty logs.
- The core keeps the first copy of an event id, orders by timestamp including sub-millisecond
  precision, and breaks timestamp ties by id without mutating the inputs.
- Content security policy restricts connections to Tauri IPC; the development policy also
  permits the local Vite server. No external service or network plugin was added.

### Verification results — 6 September 2026

| Check | Actual result |
| --- | --- |
| `npm install` | Passed at the root and in an empty temporary directory containing only the manifests and lockfile; 59 packages installed, audit reported zero vulnerabilities. |
| `npm run typecheck` | Passed. |
| `npm run lint` | Passed, no diagnostics. |
| `npm test` | Passed: five domain tests covering empty input, ordering across devices, deduplication, timestamp ties, and sub-millisecond precision. |
| `npm run build` | Passed; Vite emitted the frontend assets. |
| `cargo fmt --check` in `src-tauri/` | Passed. |
| `cargo clippy -- -D warnings` in `src-tauri/` | Passed with no warnings. |
| `cargo test` in `src-tauri/` | Passed: five storage tests covering restart persistence and one-line append, malformed/truncated records, multi-device reads, corrupt identity, and concurrent stores. |
| Documentation and core boundary checks | Local links and anchors, phase metadata, roadmap dependencies, and previous/next chain passed; no React or Tauri imports in `src/core/`. |

Dependency downloads required network-enabled execution because the workspace sandbox could
not resolve package registries. No system packages were installed.

| Desktop check | Actual result |
| --- | --- |
| `npm run tauri dev` under `xvfb-run -a` | Passed: real 800×600 Tauri/WebKit window on an isolated X11 display. Activating the button once wrote exactly one JSONL line and displayed that event. |
| Close and restart `npm run tauri dev` with the same temporary `XDG_DATA_HOME` | Passed: the event appeared without another activation; the JSONL file still had one line. Before-close and after-restart screenshots were identical. |
| `npm run tauri build -- --debug --no-bundle` | Passed: local executable built with embedded frontend assets. CLI warns that the provisional identifier ends in `.app`, relevant before macOS distribution; the accepted identifier is retained. |
| Standalone executable, button activation, and restart under Xvfb | Passed with separate temporary data and no Vite server; one event was written and displayed again after restart. |
| `strace -f -e trace=network` on the standalone executable | No IPv4/IPv6 socket, connect, or sendto calls during startup and button round-trip. Local Unix IPC and netlink inspection were present. Source and CSP checks also found no external network feature. |

The round-trip button this phase verified was replaced by the tracking window in
[Phase 2](phase-2-tracking-implementation.md), whose first acceptance check exercises the same
append-and-read path. The results above record what was checked at the time.

Smoke-test screenshots and temporary placeholder logs were inspected under
`/tmp/konzendi-phase0-check` and `/tmp/konzendi-phase0-offline`; they are not repository data.
The first offline test accidentally copied a development executable while the restart test
was rebuilding the same output path; it attempted localhost and failed. Rebuilding after the
development test stopped and copying the standalone executable resolved the test setup error.
Xvfb emitted DRI3 acceleration warnings but rendered the application successfully. This
verification covers the local Linux/X11 foundation, not physical-display acceleration,
tracking usefulness, packaging, or other platforms.

## Rollout and rollback

Delivery is local: the phase is complete when the checks above pass on the development machine.
Nothing is published, signed, or distributed, and no external service is configured.

Rollback is removing the generated application files and their entries in `.gitignore`; the
planning documentation stands on its own without them. Scaffolding must not modify
`README.md`, `CLAUDE.md`, `AGENTS.md`, or `docs/`. There is no data compatibility concern,
as no tracking data exists before this phase and the round-trip log holds only placeholder
records. Preserve unrelated files and existing user work.
