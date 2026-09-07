# Konzendi

A project exploring a simple, robust tool for people working on a computer, especially
developers and engineers, to understand context switching and reflect on their working habits.

The current application tracks topics on Linux: name what you are working on, switch with one
click or one key, pause, undo an entry, and correct a time. Every action is appended to a local
JSONL event log, and the screen is a fold of that log. Analytics, scoring, synchronization, the
global shortcut and tray, and the commercial model remain undecided. There are no accounts or
backend services.

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
starts the next in one action, **Pause** is a state of its own, **Undo** takes back the last
entry, and **adjust** back-dates one. **Entries** lists everything recorded, including revoked
entries and a way to insert a switch that was missed; **Topics** renames and archives.

Nothing is ever edited or deleted: an undo and a correction are new events that reference an
earlier one. Close and reopen the application and the same state comes back, because it is read
from the log.

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
for a local offline check; no installer, signing, or release workflow is configured.

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

- `src/` — React interface; `src/core/` — framework-independent event merging and tests.
- `src-tauri/src/` — Rust storage and Tauri commands.
- `docs/` — roadmap, decisions, phase plans, and discussion history.

Start with the [roadmap](docs/ROADMAP.md), then the [open questions](docs/OPEN_QUESTIONS.md).
Working conventions live in [AGENTS.md](AGENTS.md); `CLAUDE.md` links to it.
The [original concept](docs/brainstorming/context-switching-app-concept.md) preserves proposed
options; it is not an approved implementation specification. Verification evidence lives in
[Phase 0](docs/phases/phase-0-repo-setup.md#acceptance-and-verification).
