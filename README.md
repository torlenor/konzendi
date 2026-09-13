# Konzendi

A project exploring a simple, robust tool for people working on a computer, especially
developers and engineers, to understand context switching and reflect on their working habits.

The current application tracks topics on Linux: name what you are working on, switch with one
click or one key, stop, undo an entry, and correct a time. A global shortcut and a tray icon do
the same without leaving the application you are working in. A day view draws the result as a
timeline with a few plain sums. Every action is appended to a local JSONL event log, and the
screen is a fold of that log. Scoring, synchronization, and the commercial model remain
undecided. There are no accounts or backend services.

## Local setup

Use Linux with an X11 session. Install Node.js 24 with npm and Rust 1.98 (the verified toolchain). On Ubuntu 24.04 / Linux Mint 22,
the native prerequisites can be installed with:

```bash
sudo apt update
sudo apt install build-essential pkg-config libwebkit2gtk-4.1-dev libssl-dev librsvg2-dev libayatana-appindicator3-dev patchelf
```

See the [Tauri Linux prerequisites](https://v2.tauri.app/start/prerequisites/#linux) for other
distributions. These packages were already installed on the development machine; the install
command itself was not needed during verification.

From the repository root:

```bash
npm install
npm run tauri dev
```

The initial dependency installation and Rust build need internet access. Development uses a
local Vite server on port 1420 and its hot-reload connection. The application has no external
network features. `npm run dev` alone opens only the frontend server; persistence requires
the Tauri desktop shell.

On first run the window asks what you are working on. Name a topic and start: the elapsed time
becomes the largest thing on screen. Switching to another topic ends the running interval and
starts the next in one action, **Stop** is the one way to have nothing tracked, **Undo** takes
back the last entry, and **adjust** back-dates one. **Analytics** draws one day as a lane per
topic, with the time recorded on each, the number of switches, and the longest uninterrupted
stretch; a stretch that nothing ended is marked, not trimmed, and time when tracking was stopped
is a gap rather than a measurement. **Entries** lists everything recorded, including revoked
entries and a way to insert a switch that was missed; **Topics** renames and archives.

The analytics view reads the log and writes nothing. Its sums say what was logged; they are not a
measure of work.

Nothing is ever edited or deleted: an undo and a correction are new events that reference an
earlier one. Close and reopen the application and the same state comes back, because it is read
from the log.

### Quick access

Press **Ctrl+Alt+K** anywhere to open a small switcher over whatever you are working in: press a
topic's number to switch, `s` to stop, `u` to undo the last entry, or Escape to close it. The
window that had the keyboard gets it back. The combination is shown at the bottom of the
tracking window, where **change** records a new one; if another application already holds it, or
the session is not X11, the same line says so instead of pretending the shortcut works. The key
grab is X11-only.

The tray icon offers the same three actions with the pointer, plus reopening the window and
quitting. Closing the tracking window leaves Konzendi running in the tray, because a global
shortcut only exists while the application does; **Quit Konzendi** in the tray menu ends it.

## Checks

From the root:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Rust checks:

```bash
cd src-tauri
cargo fmt --check
cargo clippy -- -D warnings
cargo test
```

Use `npm run format` at the root and `cargo fmt` in `src-tauri/` to format code.
`npm run tauri build -- --debug --no-bundle` builds an executable with embedded frontend assets
for a local offline check.

Release tooling has its own checks:

```bash
npm run test:scripts                        # release helper tests (Node's test runner)
npm run tauri build -- --bundles deb        # Debian package in src-tauri/target/release/bundle/deb/
scripts/package-smoke.sh src-tauri/target/release/bundle/deb/Konzendi_*_amd64.deb /tmp/konzendi-smoke
```

The package smoke test needs Docker. It installs the package in a clean Ubuntu 24.04 container
and drives it offline with synthetic data; it never uses your display or your log.

GitHub Actions runs the `frontend`, `rust`, and `package-smoke` jobs on every pull request and
push to `main` ([`ci.yml`](.github/workflows/ci.yml)). GitHub does not block a merge on them in
this private repository, so merge only with green checks.

## Releases

Releases are private, unsigned Debian packages for x86_64 Ubuntu 24.04 and Linux Mint 22 under
X11, with SHA-256 checksums. You prepare the version and the changelog locally and push a tag;
GitHub checks the tagged commit, builds and tests the package, and creates a draft release. You
publish the draft by hand. No workflow commits, tags, or publishes.

1. Write the changes under `## [Unreleased]` in [CHANGELOG.md](CHANGELOG.md), including
   `### Compatibility` and `### Known limitations`.
2. Prepare the release on an up-to-date `main`. The commands use `0.1.2` as the example
   version. This writes the version to the five version files and dates the changelog entry;
   it does not stage, commit, or tag:

   ```bash
   git switch main && git pull --ff-only
   npm run release:prepare -- 0.1.2
   ```

3. Review, check, commit the listed files, and push `main`:

   ```bash
   git diff
   npm run release:check -- 0.1.2
   git add CHANGELOG.md package.json package-lock.json src-tauri/tauri.conf.json src-tauri/Cargo.toml src-tauri/Cargo.lock
   git commit -m 'Release 0.1.2'
   git push origin main
   ```

4. Wait until CI passes for that commit, and confirm that the worktree is clean and `HEAD` is the
   checked commit:

   ```bash
   gh run watch "$(gh run list --workflow CI --commit "$(git rev-parse HEAD)" --json databaseId --jq '.[0].databaseId')" --exit-status
   git fetch origin
   test -z "$(git status --porcelain)" && test "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" && echo ready
   ```

5. Create and push the annotated tag. A tag that exists only locally does not start anything;
   pushing it starts the release workflow:

   ```bash
   git tag -a v0.1.2 -m 'Release 0.1.2'
   git push origin v0.1.2
   ```

6. Wait for the release run, then open the draft from the run summary or the repository's
   **Releases** page. Check the notes and the checksums, then select **Edit** →
   **Publish release**:

   ```bash
   gh run watch "$(gh run list --workflow Release --limit 1 --json databaseId --jq '.[0].databaseId')" --exit-status
   gh release download v0.1.2 --repo torlenor/konzendi --dir /tmp/konzendi-0.1.2
   (cd /tmp/konzendi-0.1.2 && sha256sum --check SHA256SUMS)
   ```

[docs/RELEASING.md](docs/RELEASING.md) covers manual preparation, hotfixes, re-runs and
recovery, data compatibility, artifact retention, and toolchain maintenance.

To install a release, download `konzendi_VERSION_amd64.deb` and `SHA256SUMS`, run
`sha256sum --check --ignore-missing SHA256SUMS`, back up `~/.local/share/com.konzendi.app`, and
run `sudo apt install ./konzendi_VERSION_amd64.deb`. The checksum detects a damaged download; it
does not prove who built the package. Bundled third-party licences are listed in
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and installed to `/usr/share/doc/konzendi/`.

## Local data

On Linux, files live in `$XDG_DATA_HOME/com.konzendi.app`, defaulting to
`~/.local/share/com.konzendi.app`:

- `device.json` holds the persistent device UUID.
- `events/<device-id>.jsonl` holds append-only event records.
- `store.lock` coordinates storage access across application processes.

Each event has an id, originating device id, UTC recorded timestamp, kind, and payload.
Reads combine all JSONL files in `events/`; malformed lines are skipped with file and line
number reported to stderr. I/O errors are surfaced in the interface. An invalid identity file
stops startup rather than silently assigning a new identity. Preserve the files when diagnosing
errors. After an uncertain write failure, restart and inspect the log before retrying.

For a manual backup, close the app and copy the data directory somewhere private. To restore
on the same device, close the app before replacing its data with the backup. To inspect a log
from another device, copy its JSONL file into `events/`, preserving its filename; keep the local
`device.json`. There is no import/export UI or automatic synchronization. Never place personal
logs in this repository.

## Repository and planning

- `src/` — React interface, both the tracking window and the quick switcher; `src/core/` —
  framework-independent event merging and tests.
- `src-tauri/src/` — Rust storage, Tauri commands, and the X11 requests quick access needs.
- `scripts/` — release helpers, notice generation, and the package smoke test, with their tests.
- `.github/workflows/` — CI and the tag-triggered release workflow.
- `docs/` — roadmap, decisions, phase plans, and discussion history.

Start with the [roadmap](docs/ROADMAP.md), then the [open questions](docs/OPEN_QUESTIONS.md).
Working conventions live in [AGENTS.md](AGENTS.md); `CLAUDE.md` links to it.
The [original concept](docs/brainstorming/context-switching-app-concept.md) preserves proposed
options; it is not an approved implementation specification. Verification evidence lives in
[Phase 0](docs/phases/phase-0-repo-setup.md#acceptance-and-verification).
